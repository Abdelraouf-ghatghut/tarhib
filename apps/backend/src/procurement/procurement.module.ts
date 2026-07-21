import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity.js';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity.js';
import { ProcurementService } from './procurement.service.js';
import { ProcurementController } from './procurement.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderLine,
      Branch,
      Employee,
      Product,
    ]),
    InventoryModule,
    NotificationsModule,
  ],
  providers: [ProcurementService],
  controllers: [ProcurementController],
})
export class ProcurementModule {}
