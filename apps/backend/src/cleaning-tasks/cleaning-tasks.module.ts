import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleaningTask } from './entities/cleaning-task.entity.js';
import { CleaningTasksController } from './cleaning-tasks.controller.js';
import { CleaningTasksService } from './cleaning-tasks.service.js';
import { OperationalZonesModule } from '../operational-zones/operational-zones.module.js';
@Module({
  imports: [TypeOrmModule.forFeature([CleaningTask]), OperationalZonesModule],
  controllers: [CleaningTasksController],
  providers: [CleaningTasksService],
})
export class CleaningTasksModule {}
