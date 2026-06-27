import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { Order } from './entities/order.entity.js';
import { OrderLine } from './entities/order-line.entity.js';
import { ValidationEngineService } from './validation-engine/validation-engine.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderLine])],
  providers: [OrdersService, ValidationEngineService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
