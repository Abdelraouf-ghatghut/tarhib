import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleaningTask } from '../cleaning-tasks/entities/cleaning-task.entity.js';
import { RoomBooking } from '../meeting-rooms/entities/room-booking.entity.js';
import { MeetingPreparation } from './entities/meeting-preparation.entity.js';
import { MeetingPreparationParticipant } from './entities/meeting-preparation-participant.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { MeetingPreparationsController } from './meeting-preparations.controller.js';
import { MeetingPreparationsService } from './meeting-preparations.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MeetingPreparation,
      MeetingPreparationParticipant,
      RoomBooking,
      CleaningTask,
      Employee,
    ]),
  ],
  controllers: [MeetingPreparationsController],
  providers: [MeetingPreparationsService],
})
export class MeetingPreparationsModule {}
