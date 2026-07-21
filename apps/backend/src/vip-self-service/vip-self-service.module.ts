import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VipReplenishmentTask } from './entities/vip-replenishment-task.entity.js';
import { VipLocation } from './entities/vip-location.entity.js';
import { VipLocationProduct } from './entities/vip-location-product.entity.js';
import { VipSelfServiceService } from './vip-self-service.service.js';
import { VipSelfServiceController } from './vip-self-service.controller.js';
import { Product } from '../products/entities/product.entity.js';
import { InventoryModule } from '../inventory/inventory.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VipReplenishmentTask,
      VipLocation,
      VipLocationProduct,
      Product,
    ]),
    InventoryModule,
  ],
  providers: [VipSelfServiceService],
  controllers: [VipSelfServiceController],
  exports: [VipSelfServiceService],
})
export class VipSelfServiceModule {}
