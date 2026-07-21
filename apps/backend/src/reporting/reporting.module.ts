import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { MeetingRoom } from '../meeting-rooms/entities/meeting-room.entity.js';
import { RoomBooking } from '../meeting-rooms/entities/room-booking.entity.js';
import { PurchaseOrderLine } from '../procurement/entities/purchase-order-line.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { OrderLine } from '../orders/entities/order-line.entity.js';
import { Quota } from '../quotas/entities/quota.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { ReportingService } from './reporting.service.js';
import { ReportingController } from './reporting.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      InventoryItem,
      MeetingRoom,
      RoomBooking,
      PurchaseOrderLine,
      Product,
      Company,
      Branch,
      Employee,
      OrderLine,
      Quota,
    ]),
    AuthModule,
  ],
  providers: [ReportingService],
  controllers: [ReportingController],
})
export class ReportingModule {}
