import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryItem } from './entities/inventory-item.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItem])],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
