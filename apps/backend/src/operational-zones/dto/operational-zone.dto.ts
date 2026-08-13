import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OperationalZoneType } from '../entities/operational-zone.entity.js';

export class CreateOperationalZoneDto {
  @IsUUID() companyId!: string;
  @IsUUID() branchId!: string;
  @IsEnum(OperationalZoneType) type!: OperationalZoneType;
  @IsString() @MinLength(2) @MaxLength(120) nameAr!: string;
  @IsOptional() @IsString() @MaxLength(120) nameEn?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  floors!: string[];
}

export class AssignOperationalZoneDto {
  @IsUUID() employeeId!: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
}

export class SetZoneAssignmentStatusDto {
  @IsBoolean() active!: boolean;
}
