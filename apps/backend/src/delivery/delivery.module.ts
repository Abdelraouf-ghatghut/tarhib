import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from '../orders/orders.module.js';
import { DeliveryController } from './delivery.controller.js';
import { DeliveryService } from './delivery.service.js';
import { DeliveryTask } from './entities/delivery-task.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { Order } from '../orders/entities/order.entity.js';

@Module({
  imports: [
    OrdersModule,
    NotificationsModule,
    TypeOrmModule.forFeature([DeliveryTask, Employee, Company, Branch, Order]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
})
export class DeliveryModule {}
