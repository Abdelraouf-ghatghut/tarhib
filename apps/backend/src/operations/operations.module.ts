import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessModule } from '../access/access.module.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { OperationsController } from './operations.controller.js';
import { CleaningTask } from '../cleaning-tasks/entities/cleaning-task.entity.js';
import { MeetingPreparation } from '../meeting-preparations/entities/meeting-preparation.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, CleaningTask, MeetingPreparation]),
    AccessModule,
  ],
  controllers: [OperationsController],
})
export class OperationsModule {}
