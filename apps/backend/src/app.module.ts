import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import * as path from 'path';
import { EnrichUserInterceptor } from './auth/interceptors/enrich-user.interceptor.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './auth/guards/permissions.guard.js';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      expandVariables: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
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
          logging: false,
        };
      },
    }),

    // Registered here so EnrichUserInterceptor can access Employee + Role repos at the app level
    TypeOrmModule.forFeature([Employee, Role]),
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
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: EnrichUserInterceptor,
    },
  ],
})
export class AppModule {}
