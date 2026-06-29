import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { MeetingRoom } from '../meeting-rooms/entities/meeting-room.entity.js';
import { RoomBooking } from '../meeting-rooms/entities/room-booking.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { ReportingService } from './reporting.service.js';
import { ReportingController } from './reporting.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, InventoryItem, MeetingRoom, RoomBooking]),
    AuthModule,
  ],
  providers: [ReportingService],
  controllers: [ReportingController],
})
export class ReportingModule {}
