import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { LeaveRequestStatus } from '../entities/leave-request.entity.js';
import {
  EmploymentContractStatus,
  EmploymentContractType,
} from '../entities/employment-contract.entity.js';
import { PerformanceReviewStatus } from '../entities/performance-review.entity.js';

// ---- Leave types ----

export class CreateLeaveTypeDto {
  @ApiProperty() @IsString() @MinLength(2) nameAr!: string;
  @ApiProperty() @IsString() @MinLength(2) nameEn!: string;
  @ApiProperty({ example: 21 }) @IsNumber() @Min(0) defaultDaysPerYear!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateLeaveTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameAr?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameEn?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultDaysPerYear?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class LeaveTypeDto {
  @ApiProperty() id!: string;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty() defaultDaysPerYear!: number;
  @ApiProperty() active!: boolean;
}

// ---- Leave requests ----

export class CreateLeaveRequestDto {
  @ApiProperty() @IsUUID() employeeId!: string;
  @ApiProperty() @IsUUID() leaveTypeId!: string;
  @ApiProperty({ example: '2026-08-01' }) @IsDateString() startDate!: string;
  @ApiProperty({ example: '2026-08-03' }) @IsDateString() endDate!: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() reason?:
    | string
    | null;
}

export class LeaveRequestDto {
  @ApiProperty() id!: string;
  @ApiProperty() employeeId!: string;
  @ApiProperty() leaveTypeId!: string;
  @ApiProperty() startDate!: string;
  @ApiProperty() endDate!: string;
  @ApiProperty() daysCount!: number;
  @ApiProperty({ enum: LeaveRequestStatus }) status!: LeaveRequestStatus;
  @ApiProperty({ nullable: true }) approverId!: string | null;
  @ApiProperty({ nullable: true }) reason!: string | null;
}

// ---- Leave balances ----

export class LeaveBalanceDto {
  @ApiProperty() id!: string;
  @ApiProperty() employeeId!: string;
  @ApiProperty() leaveTypeId!: string;
  @ApiProperty() year!: number;
  @ApiProperty() entitled!: number;
  @ApiProperty() taken!: number;
  @ApiProperty({ description: 'Dérivé (entitled - taken), jamais stocké' })
  remaining!: number;
}

// ---- Payroll tax config ----

export class UpdatePayrollTaxConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  incomeTaxBracket1Rate?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  incomeTaxBracket1Ceiling?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  incomeTaxBracket2Rate?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  personalExemptionThreshold?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  jihadTaxIndividualRate?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  solidarityFundRate?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  payrollStampDutyRate?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cnssEmployeeRate?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cnssEmployerRate?: number;
}

export class PayrollTaxConfigDto {
  @ApiProperty() id!: string;
  @ApiProperty() incomeTaxBracket1Rate!: number;
  @ApiProperty() incomeTaxBracket1Ceiling!: number;
  @ApiProperty() incomeTaxBracket2Rate!: number;
  @ApiProperty() personalExemptionThreshold!: number;
  @ApiProperty() jihadTaxIndividualRate!: number;
  @ApiProperty() solidarityFundRate!: number;
  @ApiProperty() payrollStampDutyRate!: number;
  @ApiProperty() cnssEmployeeRate!: number;
  @ApiProperty() cnssEmployerRate!: number;
}

// ---- Payslips ----

export class PayslipDto {
  @ApiProperty() id!: string;
  @ApiProperty() employeeId!: string;
  @ApiProperty() period!: string;
  @ApiProperty() grossSalary!: number;
  @ApiProperty() cnssEmployeeContribution!: number;
  @ApiProperty() cnssEmployerContribution!: number;
  @ApiProperty() solidarityFundAmount!: number;
  @ApiProperty() jihadTaxAmount!: number;
  @ApiProperty() incomeTaxAmount!: number;
  @ApiProperty() stampDutyAmount!: number;
  @ApiProperty() netPay!: number;
  @ApiProperty() expenseId!: string;
  @ApiProperty() generatedAt!: string;
}

// ---- Employment contracts ----

export class CreateEmploymentContractDto {
  @ApiProperty() @IsUUID() employeeId!: string;
  @ApiProperty({ enum: EmploymentContractType })
  @IsEnum(EmploymentContractType)
  type!: EmploymentContractType;
  @ApiProperty({ example: '2026-01-01' }) @IsDateString() startDate!: string;
  @ApiPropertyOptional({ nullable: true, example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;
  @ApiProperty() @IsString() @MinLength(2) jobTitle!: string;
  @ApiProperty({ example: 3000 }) @IsNumber() @Min(0) baseSalary!: number;
  @ApiPropertyOptional({ enum: EmploymentContractStatus })
  @IsOptional()
  @IsEnum(EmploymentContractStatus)
  status?: EmploymentContractStatus;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  documentUrl?: string | null;
}

export class UpdateEmploymentContractDto {
  @ApiPropertyOptional({ enum: EmploymentContractType })
  @IsOptional()
  @IsEnum(EmploymentContractType)
  type?: EmploymentContractType;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  jobTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) baseSalary?: number;
  @ApiPropertyOptional({ enum: EmploymentContractStatus })
  @IsOptional()
  @IsEnum(EmploymentContractStatus)
  status?: EmploymentContractStatus;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  documentUrl?: string | null;
}

export class EmploymentContractDto {
  @ApiProperty() id!: string;
  @ApiProperty() employeeId!: string;
  @ApiProperty({ enum: EmploymentContractType }) type!: EmploymentContractType;
  @ApiProperty() startDate!: string;
  @ApiProperty({ nullable: true }) endDate!: string | null;
  @ApiProperty() jobTitle!: string;
  @ApiProperty() baseSalary!: number;
  @ApiProperty({ enum: EmploymentContractStatus })
  status!: EmploymentContractStatus;
  @ApiProperty({ nullable: true }) documentUrl!: string | null;
}

// ---- Performance reviews ----

export class CreatePerformanceReviewDto {
  @ApiProperty() @IsUUID() employeeId!: string;
  @ApiProperty() @IsUUID() reviewerId!: string;
  @ApiProperty({ example: '2026-07-01' }) @IsDateString() reviewDate!: string;
  @ApiProperty({ example: 4 }) @IsInt() @Min(1) @Max(5) rating!: number;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  strengths?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  areasForImprovement?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() comments?:
    | string
    | null;
  @ApiPropertyOptional({ enum: PerformanceReviewStatus })
  @IsOptional()
  @IsEnum(PerformanceReviewStatus)
  status?: PerformanceReviewStatus;
}

export class UpdatePerformanceReviewDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() reviewDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  strengths?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  areasForImprovement?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() comments?:
    | string
    | null;
  @ApiPropertyOptional({ enum: PerformanceReviewStatus })
  @IsOptional()
  @IsEnum(PerformanceReviewStatus)
  status?: PerformanceReviewStatus;
}

export class PerformanceReviewDto {
  @ApiProperty() id!: string;
  @ApiProperty() employeeId!: string;
  @ApiProperty() reviewerId!: string;
  @ApiProperty() reviewDate!: string;
  @ApiProperty() rating!: number;
  @ApiProperty({ nullable: true }) strengths!: string | null;
  @ApiProperty({ nullable: true }) areasForImprovement!: string | null;
  @ApiProperty({ nullable: true }) comments!: string | null;
  @ApiProperty({ enum: PerformanceReviewStatus })
  status!: PerformanceReviewStatus;
}
