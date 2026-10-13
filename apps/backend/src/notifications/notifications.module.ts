import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Notification } from './entities/notification.entity.js';
import { NotificationsController } from './notifications.controller.js';
import { AccessModule } from '../access/access.module.js';
import { HttpModule } from '@nestjs/axios';
import { WhatsAppService } from './whatsapp.service.js';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Employee, Notification]), AccessModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, WhatsAppService],
  exports: [NotificationsService, NotificationsGateway, WhatsAppService],
})
export class NotificationsModule {}
