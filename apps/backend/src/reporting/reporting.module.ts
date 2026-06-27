import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { ReportingService } from './reporting.service.js';
import { ReportingController } from './reporting.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Order, InventoryItem]), AuthModule],
  providers: [ReportingService],
  controllers: [ReportingController],
})
export class ReportingModule {}
