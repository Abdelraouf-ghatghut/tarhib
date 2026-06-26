import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from "class-validator";

export enum EmployeeRole {
  EMPLOYEE = "EMPLOYEE",
  DEPARTMENT_MANAGER = "DEPARTMENT_MANAGER",
  INVENTORY_MANAGER = "INVENTORY_MANAGER",
  HOSPITALITY_AGENT = "HOSPITALITY_AGENT",
  ADMIN = "ADMIN",
}

export class CreateEmployeeDto {
  @ApiProperty({ example: "d290f1ee-6c54-4b01-90e6-d701748f0854" })
  @IsUUID()
  companyId!: string;

  @ApiProperty({ example: "d290f1ee-6c54-4b01-90e6-d701748f0853" })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: "d290f1ee-6c54-4b01-90e6-d701748f0852" })
  @IsUUID()
  departmentId!: string;

  @ApiProperty({ example: "محمد" })
  @IsString()
  @MinLength(1)
  firstNameAr!: string;

  @ApiProperty({ example: "Mohamed" })
  @IsString()
  @MinLength(1)
  firstNameEn!: string;

  @ApiProperty({ example: "علي" })
  @IsString()
  @MinLength(1)
  lastNameAr!: string;

  @ApiProperty({ example: "Ali" })
  @IsString()
  @MinLength(1)
  lastNameEn!: string;

  @ApiProperty({ example: "m.ali@company.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "+213555000000", description: "Format E.164 international" })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: "phoneNumber must be E.164 format (e.g. +213555000000)" })
  phoneNumber!: string;

  @ApiProperty({ enum: EmployeeRole })
  @IsEnum(EmployeeRole)
  role!: EmployeeRole;
}

export class EmployeeDto {
  @ApiProperty({ example: "d290f1ee-6c54-4b01-90e6-d701748f0851" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "d290f1ee-6c54-4b01-90e6-d701748f0854" })
  @IsUUID()
  companyId!: string;

  @ApiProperty({ example: "d290f1ee-6c54-4b01-90e6-d701748f0853" })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: "d290f1ee-6c54-4b01-90e6-d701748f0852" })
  @IsUUID()
  departmentId!: string;

  @ApiProperty({ example: "محمد" })
  @IsString()
  firstNameAr!: string;

  @ApiProperty({ example: "Mohamed" })
  @IsString()
  firstNameEn!: string;

  @ApiProperty({ example: "علي" })
  @IsString()
  lastNameAr!: string;

  @ApiProperty({ example: "Ali" })
  @IsString()
  lastNameEn!: string;

  @ApiProperty({ example: "m.ali@company.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "+213555000000" })
  @IsString()
  phoneNumber!: string;

  @ApiProperty({ enum: EmployeeRole })
  @IsEnum(EmployeeRole)
  role!: EmployeeRole;

  @ApiProperty({ example: true })
  @IsBoolean()
  active!: boolean;
}
