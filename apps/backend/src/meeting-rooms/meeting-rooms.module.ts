import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingRoom } from './entities/meeting-room.entity.js';
import { RoomBooking } from './entities/room-booking.entity.js';
import { MeetingServicePackage } from '../meeting-service-packages/entities/meeting-service-package.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { MeetingRoomsService } from './meeting-rooms.service.js';
import { MeetingRoomsController } from './meeting-rooms.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MeetingRoom,
      RoomBooking,
      MeetingServicePackage,
      Role,
    ]),
  ],
  controllers: [MeetingRoomsController],
  providers: [MeetingRoomsService],
  exports: [MeetingRoomsService],
})
export class MeetingRoomsModule {}
