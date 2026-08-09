import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrModule } from '../hr/hr.module.js';
import { CompanyDocument } from './entities/company-document.entity.js';
import { CompanyDocumentsController } from './company-documents.controller.js';
import { CompanyDocumentsService } from './company-documents.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyDocument]), HrModule],
  controllers: [CompanyDocumentsController],
  providers: [CompanyDocumentsService],
})
export class CompanyDocumentsModule {}
