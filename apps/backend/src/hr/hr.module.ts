import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveType } from './entities/leave-type.entity.js';
import { LeaveRequest } from './entities/leave-request.entity.js';
import { LeaveBalance } from './entities/leave-balance.entity.js';
import { PayrollTaxConfig } from './entities/payroll-tax-config.entity.js';
import { Payslip } from './entities/payslip.entity.js';
import { EmploymentContract } from './entities/employment-contract.entity.js';
import { PerformanceReview } from './entities/performance-review.entity.js';
import { HrService } from './hr.service.js';
import { PayslipService } from './payslip.service.js';
import { HrController } from './hr.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeaveType,
      LeaveRequest,
      LeaveBalance,
      PayrollTaxConfig,
      Payslip,
      EmploymentContract,
      PerformanceReview,
    ]),
  ],
  providers: [HrService, PayslipService],
  controllers: [HrController],
  exports: [PayslipService],
})
export class HrModule {}
