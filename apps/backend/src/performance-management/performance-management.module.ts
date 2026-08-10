import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingModule } from '../accounting/accounting.module.js';
import { FinanceAccount } from '../finance/entities/finance-account.entity.js';
import { FinanceExpense } from '../finance/entities/finance-expense.entity.js';
import { RoomBooking } from '../meeting-rooms/entities/room-booking.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderLine } from '../orders/entities/order-line.entity.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import {
  BillingInvoice,
  BillingPayment,
  BillingRevenueRecognition,
  BookingAttendance,
  ForecastSnapshot,
  ManagementBudget,
  OrderCostSnapshot,
  ServiceFeedback,
  GeneratedDocument,
} from './entities/performance.entities.js';
import { InvoicePdfService } from './invoice-pdf.service.js';
import { PerformanceManagementController } from './performance-management.controller.js';
import { PerformanceManagementService } from './performance-management.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BillingInvoice,
      BillingPayment,
      BillingRevenueRecognition,
      ManagementBudget,
      OrderCostSnapshot,
      ServiceFeedback,
      BookingAttendance,
      ForecastSnapshot,
      Order,
      OrderLine,
      InventoryItem,
      Product,
      RoomBooking,
      FinanceExpense,
      FinanceAccount,
      Company,
      GeneratedDocument,
    ]),
    AccountingModule,
  ],
  controllers: [PerformanceManagementController],
  providers: [PerformanceManagementService, InvoicePdfService],
  exports: [PerformanceManagementService, InvoicePdfService],
})
export class PerformanceManagementModule {}
