import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EnrichUserInterceptor } from './auth/interceptors/enrich-user.interceptor.js';
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
import { AuditModule } from './audit/audit.module';
import { PrioritySlaModule } from './priority-sla/priority-sla.module.js';

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
        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
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
    AuditModule,
    PrioritySlaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: EnrichUserInterceptor,
    },
  ],
})
export class AppModule {}
