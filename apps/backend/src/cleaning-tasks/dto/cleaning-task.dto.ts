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
