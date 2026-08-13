import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CleaningTaskRecurrence } from '../entities/cleaning-task.entity.js';

export class CreateCleaningTaskDto {
  @IsUUID()
  companyId!: string;

  @IsUUID()
  branchId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  assignedEmployeeId?: string;

  @IsUUID()
  @IsOptional()
  operationalZoneId?: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  building?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  floor?: string;

  @IsString()
  @MaxLength(160)
  @IsOptional()
  locationName?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsEnum(CleaningTaskRecurrence)
  @IsOptional()
  recurrence?: CleaningTaskRecurrence;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AssignCleaningTaskDto {
  @IsUUID()
  employeeId!: string;
}
