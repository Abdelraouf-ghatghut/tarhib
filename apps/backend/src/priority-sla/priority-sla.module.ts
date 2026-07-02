import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanySlaLevel } from './entities/company-sla-level.entity.js';
import { PrioritySlaService } from './priority-sla.service.js';
import { PrioritySlaController } from './priority-sla.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([CompanySlaLevel])],
  controllers: [PrioritySlaController],
  providers: [PrioritySlaService],
  exports: [PrioritySlaService],
})
export class PrioritySlaModule {}
