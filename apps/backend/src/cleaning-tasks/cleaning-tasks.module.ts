import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleaningTask } from './entities/cleaning-task.entity.js';
import { CleaningTasksController } from './cleaning-tasks.controller.js';
import { CleaningTasksService } from './cleaning-tasks.service.js';
@Module({
  imports: [TypeOrmModule.forFeature([CleaningTask])],
  controllers: [CleaningTasksController],
  providers: [CleaningTasksService],
})
export class CleaningTasksModule {}
