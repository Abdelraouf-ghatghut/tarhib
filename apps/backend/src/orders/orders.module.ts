import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { Order } from './entities/order.entity.js';
import { OrderLine } from './entities/order-line.entity.js';
import { ValidationEngineService } from './validation-engine/validation-engine.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PrioritySlaModule } from '../priority-sla/priority-sla.module.js';
import { QuotasModule } from '../quotas/quotas.module.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductRecipeLine } from '../products/entities/product-recipe-line.entity.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { Quota } from '../quotas/entities/quota.entity.js';
import { RoleQuota } from '../roles/entities/role-quota.entity.js';
import { EmployeeQuotaUsage } from '../roles/entities/employee-quota-usage.entity.js';
import { Role } from '../roles/entities/role.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderLine,
      Employee,
      Product,
      ProductRecipeLine,
      InventoryItem,
      Quota,
      RoleQuota,
      EmployeeQuotaUsage,
      Role,
    ]),
    NotificationsModule,
    PrioritySlaModule,
    QuotasModule,
    InventoryModule,
  ],
  providers: [OrdersService, ValidationEngineService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
