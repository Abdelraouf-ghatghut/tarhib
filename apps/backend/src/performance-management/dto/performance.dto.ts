import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  AttendanceStatus,
  BudgetLineValue,
  BudgetStatus,
  ForecastKind,
  InvoiceLineValue,
} from '../entities/performance.entities.js';

export class InvoiceLineDto implements InvoiceLineValue {
  @IsString() description!: string;
  @IsNumber() @Min(0.0001) quantity!: number;
  @IsNumber() @Min(0) unitPrice!: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) taxRate?: number;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsUUID() productId?: string;
}
export class CreateInvoiceDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() contractId?: string;
  @IsDateString() issueDate!: string;
  @IsDateString() dueDate!: string;
  @IsDateString() serviceFrom!: string;
  @IsDateString() serviceTo!: string;
  @IsOptional() @IsString() currency?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines!: InvoiceLineDto[];
}
export class RecordPaymentDto {
  @IsNumber() @Min(0.01) amount!: number;
  @IsDateString() paidAt!: string;
  @IsString() method!: string;
  @IsOptional() @IsString() reference?: string;
}
export class BudgetLineDto implements BudgetLineValue {
  @IsString() period!: string;
  @IsOptional() @IsString() accountCode?: string;
  @IsString() costCenter!: string;
  @IsNumber() @Min(0) amount!: number;
}
export class CreateBudgetDto {
  @IsInt() @Min(2020) fiscalYear!: number;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsInt() @Min(1) version?: number;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BudgetLineDto)
  lines!: BudgetLineDto[];
}
export class SetBudgetStatusDto {
  @IsEnum(BudgetStatus) status!: BudgetStatus;
}
export class CreateCostSnapshotDto {
  @IsUUID() orderId!: string;
  @IsOptional() @IsNumber() @Min(0) productCost?: number;
  @IsOptional() @IsNumber() @Min(0) laborCost?: number;
  @IsOptional() @IsNumber() @Min(0) deliveryCost?: number;
  @IsOptional() @IsNumber() @Min(0) overheadCost?: number;
}
export class CreateFeedbackDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() orderId?: string;
  @IsOptional() @IsUUID() bookingId?: string;
  @IsOptional() @IsUUID() employeeId?: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) qualityRating?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) punctualityRating?: number;
  @IsOptional() @IsString() comment?: string;
}
export class SetAttendanceDto {
  @IsEnum(AttendanceStatus) status!: AttendanceStatus;
  @IsOptional() @IsInt() @Min(0) actualParticipants?: number;
  @IsOptional() @IsString() absenceReason?: string;
}
export class GenerateForecastDto {
  @IsEnum(ForecastKind) kind!: ForecastKind;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() entityId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(90) horizonDays?: number;
  @IsOptional() @IsObject() factors?: Record<string, unknown>;
}
