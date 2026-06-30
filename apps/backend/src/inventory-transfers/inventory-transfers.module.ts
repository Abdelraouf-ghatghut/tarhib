import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryTransfer } from './entities/inventory-transfer.entity.js';
import { InventoryTransfersService } from './inventory-transfers.service.js';
import { InventoryTransfersController } from './inventory-transfers.controller.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryTransfer, InventoryItem])],
  providers: [InventoryTransfersService],
  controllers: [InventoryTransfersController],
  exports: [InventoryTransfersService],
})
export class InventoryTransfersModule {}
