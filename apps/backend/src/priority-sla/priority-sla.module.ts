import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanySlaLevel } from './entities/company-sla-level.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { PrioritySlaService } from './priority-sla.service.js';
import { PrioritySlaController } from './priority-sla.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([CompanySlaLevel, Role])],
  controllers: [PrioritySlaController],
  providers: [PrioritySlaService],
  exports: [PrioritySlaService],
})
export class PrioritySlaModule {}
