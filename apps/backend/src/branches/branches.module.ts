import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesService } from './branches.service.js';
import { BranchesController } from './branches.controller.js';
import { Branch } from './entities/branch.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Branch])],
  providers: [BranchesService],
  controllers: [BranchesController],
  exports: [BranchesService],
})
export class BranchesModule {}
