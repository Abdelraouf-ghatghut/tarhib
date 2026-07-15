import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryTransfersModule } from '../inventory-transfers/inventory-transfers.module.js';
import { InventoryReplenishmentRequest } from './entities/inventory-replenishment.entity.js';
import { InventoryReplenishmentsController } from './inventory-replenishments.controller.js';
import { InventoryReplenishmentsService } from './inventory-replenishments.service.js';
@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryReplenishmentRequest]),
    InventoryTransfersModule,
  ],
  controllers: [InventoryReplenishmentsController],
  providers: [InventoryReplenishmentsService],
})
export class InventoryReplenishmentsModule {}
