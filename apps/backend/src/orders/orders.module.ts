import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { Order } from './entities/order.entity.js';
import { OrderLine } from './entities/order-line.entity.js';
import { ValidationEngineService } from './validation-engine/validation-engine.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PrioritySlaModule } from '../priority-sla/priority-sla.module.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { Quota } from '../quotas/entities/quota.entity.js';
import { RoleQuota } from '../roles/entities/role-quota.entity.js';
import { EmployeeQuotaUsage } from '../roles/entities/employee-quota-usage.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderLine,
      Employee,
      Product,
      InventoryItem,
      Quota,
      RoleQuota,
      EmployeeQuotaUsage,
    ]),
    NotificationsModule,
    PrioritySlaModule,
  ],
  providers: [OrdersService, ValidationEngineService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
