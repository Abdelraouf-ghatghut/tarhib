import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service.js';
import { CompaniesController } from './companies.controller.js';
import { Company } from './entities/company.entity.js';
import { CompanyRegistrationOption } from './entities/company-registration-option.entity.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { Department } from '../departments/entities/department.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { CompanyRegistrationService } from './company-registration.service.js';
import { CompanyRegistrationController } from './company-registration.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      CompanyRegistrationOption,
      Branch,
      Department,
      Role,
    ]),
  ],
  providers: [CompaniesService, CompanyRegistrationService],
  controllers: [CompaniesController, CompanyRegistrationController],
  exports: [CompaniesService, CompanyRegistrationService],
})
export class CompaniesModule {}
