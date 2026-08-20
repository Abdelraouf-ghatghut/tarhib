import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import * as path from 'path';
import { EnrichUserInterceptor } from './auth/interceptors/enrich-user.interceptor.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './auth/guards/permissions.guard.js';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard.js';
import { Employee } from './employees/entities/employee.entity.js';
import { Role } from './roles/entities/role.entity.js';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { BranchesModule } from './branches/branches.module';
import { DepartmentsModule } from './departments/departments.module';
import { EmployeesModule } from './employees/employees.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { QuotasModule } from './quotas/quotas.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportingModule } from './reporting/reporting.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { MeetingRoomsModule } from './meeting-rooms/meeting-rooms.module';
import { MeetingServicePackagesModule } from './meeting-service-packages/meeting-service-packages.module';
import { InventoryTransfersModule } from './inventory-transfers/inventory-transfers.module';
import { VipSelfServiceModule } from './vip-self-service/vip-self-service.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ProcurementModule } from './procurement/procurement.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { DeliveryModule } from './delivery/delivery.module.js';
import { CleaningTasksModule } from './cleaning-tasks/cleaning-tasks.module.js';
import { InventoryReplenishmentsModule } from './inventory-replenishments/inventory-replenishments.module.js';
import { MeetingPreparationsModule } from './meeting-preparations/meeting-preparations.module.js';
import { CleaningStockModule } from './cleaning-stock/cleaning-stock.module.js';
import { AuditModule } from './audit/audit.module';
import { PrioritySlaModule } from './priority-sla/priority-sla.module.js';
import { AccessModule } from './access/access.module.js';
import { MobileModule } from './mobile/mobile.module.js';
import { OperationsModule } from './operations/operations.module.js';
import { FinanceModule } from './finance/finance.module.js';
import { AccountingModule } from './accounting/accounting.module.js';
import { HrModule } from './hr/hr.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { MetricsService } from './metrics/metrics.service.js';
import { CompanyDocumentsModule } from './company-documents/company-documents.module.js';
import { TypeOrmMetricsLogger } from './metrics/typeorm-metrics.logger.js';
import { PerformanceManagementModule } from './performance-management/performance-management.module.js';
import { OperationalZonesModule } from './operational-zones/operational-zones.module.js';
import { PasswordChangeRequiredGuard } from './auth/guards/password-change-required.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      expandVariables: true,
    }),

    // Défense en profondeur contre l'abus/DoS sur TOUTE l'API. Quota par
    // utilisateur authentifié (AppThrottlerGuard), pas par IP — dimensionné
    // pour 1500+ employés répartis sur plusieurs branches : chacun a son
    // propre budget, indépendant des autres employés derrière le même NAT
    // d'entreprise. Les endpoints publics sensibles (auth) resserrent par
    // IP via @Throttle par route (voir auth.controller.ts).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, MetricsModule],
      inject: [ConfigService, MetricsService],
      useFactory: (config: ConfigService, metrics: MetricsService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const migrationsRun =
          config.get<string>('TYPEORM_MIGRATIONS_RUN', 'false') === 'true';
        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
          migrationsRun,
          // Schéma piloté exclusivement par les migrations versionnées (CLAUDE.md §5).
          // synchronize:true réécrivait des colonnes au boot (ex. orders.priority)
          // et crashait l'app — interdit.
          synchronize: false,
          // PR-2.1 : logger custom qui alimente db_query_duration_seconds pour
          // (quasi) CHAQUE requête — maxQueryExecutionTime:1 force TypeORM à
          // appeler logQuerySlow (seul hook qui donne une durée) dès qu'une
          // requête dépasse 1ms, ce qui couvre en pratique la totalité du
          // trafic réel (0 aurait semblé plus logique mais TypeORM teste
          // `if (maxQueryExecutionTime && time > max)` — 0 est falsy en JS et
          // désactive silencieusement le hook, vérifié en le voyant ne jamais
          // se déclencher). Le logger ne remonte un warning visible qu'au-delà
          // de 200ms, cf. son code — 1ms ne spamme rien.
          logger: new TypeOrmMetricsLogger(metrics),
          maxQueryExecutionTime: 1,
          // PR-1.1 : pool dimensionné explicitement — le défaut pg (max:10,
          // pas de timeout de connexion) sature silencieusement sous charge
          // (le pic quota+réservation par commande tient plusieurs connexions
          // simultanées) et fait pendre les requêtes indéfiniment au lieu
          // d'échouer vite. `statement_timeout`/`idle_in_transaction_session_
          // timeout` : filet contre une requête ou une transaction abandonnée
          // qui garderait des verrous indéfiniment (le catalogue/reporting,
          // plus lents, restent sous cette limite — voir Phase 1 reporting
          // pour un budget dédié si besoin).
          extra: {
            max: 18,
            connectionTimeoutMillis: 3000,
            idleTimeoutMillis: 30_000,
            statement_timeout: 10_000,
            idle_in_transaction_session_timeout: 10_000,
          },
        };
      },
    }),

    // Registered here so EnrichUserInterceptor can access Employee + Role repos at the app level
    TypeOrmModule.forFeature([Employee, Role]),
    MetricsModule,
    RedisModule,
    AccessModule,
    MobileModule,
    OperationsModule,
    AuthModule,
    CompaniesModule,
    BranchesModule,
    DepartmentsModule,
    EmployeesModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    QuotasModule,
    NotificationsModule,
    ReportingModule,
    RolesModule,
    PermissionsModule,
    MeetingRoomsModule,
    MeetingServicePackagesModule,
    InventoryTransfersModule,
    VipSelfServiceModule,
    SuppliersModule,
    ProcurementModule,
    KitchenModule,
    DeliveryModule,
    CleaningTasksModule,
    InventoryReplenishmentsModule,
    MeetingPreparationsModule,
    CleaningStockModule,
    AuditModule,
    PrioritySlaModule,
    AccountingModule,
    HrModule,
    FinanceModule,
    CompanyDocumentsModule,
    PerformanceManagementModule,
    OperationalZonesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Contrôle d'autorisation par défaut sur TOUTE l'API : chaque route exige
    // un JWT valide sauf marquage explicite @Public(), puis les permissions
    // @RequirePermission sont vérifiées. Les @UseGuards posés au niveau des
    // contrôleurs restent en défense en profondeur.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PasswordChangeRequiredGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: EnrichUserInterceptor,
    },
  ],
})
export class AppModule {}
