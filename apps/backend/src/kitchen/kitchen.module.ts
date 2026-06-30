import { Module } from '@nestjs/common';
import { KitchenController } from './kitchen.controller.js';
import { OrdersModule } from '../orders/orders.module.js';

@Module({
  imports: [OrdersModule],
  controllers: [KitchenController],
})
export class KitchenModule {}
