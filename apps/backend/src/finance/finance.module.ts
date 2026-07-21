import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { FinanceContract } from './entities/finance-contract.entity.js';
import { FinanceExpense } from './entities/finance-expense.entity.js';
import { FinanceDebt } from './entities/finance-debt.entity.js';
import { FinanceAccount } from './entities/finance-account.entity.js';
import { FinancePeriod } from './entities/finance-period.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { AccountingModule } from '../accounting/accounting.module.js';
import { HrModule } from '../hr/hr.module.js';
import { FinanceService } from './finance.service.js';
import { FinancePayrollService } from './finance-payroll.service.js';
import { FinancePayrollCronService } from './finance-payroll-cron.service.js';
import { FinanceController } from './finance.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinanceContract,
      FinanceExpense,
      FinanceDebt,
      FinanceAccount,
      FinancePeriod,
      Employee,
    ]),
    ScheduleModule.forRoot(),
    AccountingModule,
    HrModule,
  ],
  providers: [FinanceService, FinancePayrollService, FinancePayrollCronService],
  controllers: [FinanceController],
})
export class FinanceModule {}
