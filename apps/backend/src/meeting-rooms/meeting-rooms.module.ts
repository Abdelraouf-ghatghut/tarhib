import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingRoom } from './entities/meeting-room.entity.js';
import { RoomBooking } from './entities/room-booking.entity.js';
import { MeetingRoomsService } from './meeting-rooms.service.js';
import { MeetingRoomsController } from './meeting-rooms.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([MeetingRoom, RoomBooking])],
  controllers: [MeetingRoomsController],
  providers: [MeetingRoomsService],
  exports: [MeetingRoomsService],
})
export class MeetingRoomsModule {}
