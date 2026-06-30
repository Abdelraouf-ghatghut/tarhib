import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';
import { EmployeeScope } from '../entities/employee.entity.js';

/** @deprecated Use dynamic roles via roleId. Kept for Keycloak fallback and seed compatibility. */
export enum EmployeeRole {
  EMPLOYEE = 'EMPLOYEE',
  DEPARTMENT_MANAGER = 'DEPARTMENT_MANAGER',
  INVENTORY_MANAGER = 'INVENTORY_MANAGER',
  HOSPITALITY_AGENT = 'HOSPITALITY_AGENT',
  ADMIN = 'ADMIN',
}

export class CreateEmployeeDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0854' })
  @IsUUID()
  companyId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0853' })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0852' })
  @IsUUID()
  departmentId!: string;

  @ApiProperty({ example: 'محمد' })
  @IsString()
  @MinLength(1)
  firstNameAr!: string;

  @ApiProperty({ example: 'Mohamed' })
  @IsString()
  @MinLength(1)
  firstNameEn!: string;

  @ApiProperty({ example: 'علي' })
  @IsString()
  @MinLength(1)
  lastNameAr!: string;

  @ApiProperty({ example: 'Ali' })
  @IsString()
  @MinLength(1)
  lastNameEn!: string;

  @ApiProperty({ example: 'm.ali@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+213555000000', description: 'Format E.164' })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'phoneNumber must be E.164 format' })
  phoneNumber!: string;

  @ApiPropertyOptional({ description: 'Dynamic role UUID (preferred)' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ enum: EmployeeScope })
  @IsOptional()
  @IsEnum(EmployeeScope)
  scope?: EmployeeScope;
}

export class EmployeeDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsUUID()
  companyId!: string;

  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsUUID()
  departmentId!: string;

  @ApiProperty()
  @IsString()
  firstNameAr!: string;

  @ApiProperty()
  @IsString()
  firstNameEn!: string;

  @ApiProperty()
  @IsString()
  lastNameAr!: string;

  @ApiProperty()
  @IsString()
  lastNameEn!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  phoneNumber!: string;

  @ApiPropertyOptional({ description: 'Dynamic role UUID' })
  roleId!: string | null;

  @ApiPropertyOptional({ description: 'Legacy role string (deprecated)' })
  role!: string;

  @ApiProperty({ enum: EmployeeScope })
  scope!: EmployeeScope;

  @ApiProperty()
  @IsBoolean()
  active!: boolean;
}
