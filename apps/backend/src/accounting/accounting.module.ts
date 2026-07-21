import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChartOfAccount } from './entities/chart-of-account.entity.js';
import { JournalEntry } from './entities/journal-entry.entity.js';
import { JournalEntryLine } from './entities/journal-entry-line.entity.js';
import { FiscalYear } from './entities/fiscal-year.entity.js';
import { AccountingService } from './accounting.service.js';
import { AccountingController } from './accounting.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChartOfAccount,
      JournalEntry,
      JournalEntryLine,
      FiscalYear,
    ]),
  ],
  providers: [AccountingService],
  controllers: [AccountingController],
  exports: [AccountingService],
})
export class AccountingModule {}
