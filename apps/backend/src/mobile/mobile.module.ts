import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessModule } from '../access/access.module.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { QuotasModule } from '../quotas/quotas.module.js';
import { MobileController } from './mobile.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Employee]), AccessModule, QuotasModule],
  controllers: [MobileController],
})
export class MobileModule {}
