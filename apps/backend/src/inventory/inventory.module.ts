import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryItem } from './entities/inventory-item.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { InventoryTransfer } from '../inventory-transfers/entities/inventory-transfer.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryItem, Branch, InventoryTransfer]),
    NotificationsModule,
  ],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
