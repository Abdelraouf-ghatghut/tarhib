import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditService } from './audit.service.js';
import { AuditController } from './audit.controller.js';
import { AuditInterceptor } from './audit.interceptor.js';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [
    AuditService,
    AuditInterceptor,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
