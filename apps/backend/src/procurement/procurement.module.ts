import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity.js';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity.js';
import { ProcurementService } from './procurement.service.js';
import { ProcurementController } from './procurement.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrder, PurchaseOrderLine]),
    InventoryModule,
  ],
  providers: [ProcurementService],
  controllers: [ProcurementController],
})
export class ProcurementModule {}
