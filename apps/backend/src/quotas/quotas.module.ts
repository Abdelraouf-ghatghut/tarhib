import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotasService } from './quotas.service.js';
import { QuotasController } from './quotas.controller.js';
import { Quota } from './entities/quota.entity.js';
import { RoleQuota } from '../roles/entities/role-quota.entity.js';
import { EmployeeQuotaUsage } from '../roles/entities/employee-quota-usage.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Quota, RoleQuota, EmployeeQuotaUsage])],
  providers: [QuotasService],
  controllers: [QuotasController],
  exports: [QuotasService],
})
export class QuotasModule {}
