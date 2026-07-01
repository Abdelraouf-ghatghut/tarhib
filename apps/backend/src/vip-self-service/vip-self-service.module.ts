import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VipReplenishmentTask } from './entities/vip-replenishment-task.entity.js';
import { VipSelfServiceService } from './vip-self-service.service.js';
import { VipSelfServiceController } from './vip-self-service.controller.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { Product } from '../products/entities/product.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([VipReplenishmentTask, InventoryItem, Product]),
  ],
  providers: [VipSelfServiceService],
  controllers: [VipSelfServiceController],
  exports: [VipSelfServiceService],
})
export class VipSelfServiceModule {}
