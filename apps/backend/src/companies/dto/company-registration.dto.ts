import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyRegistrationMode } from '../entities/company.entity.js';

export class CompanyRegistrationOptionInputDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsUUID()
  departmentId!: string;

  @ApiProperty()
  @IsUUID()
  roleId!: string;
}

export class UpdateCompanyRegistrationDto {
  @ApiProperty({ enum: CompanyRegistrationMode })
  @IsEnum(CompanyRegistrationMode)
  mode!: CompanyRegistrationMode;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  codeExpiresAt?: string | null;

  @ApiProperty({ type: [CompanyRegistrationOptionInputDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CompanyRegistrationOptionInputDto)
  options!: CompanyRegistrationOptionInputDto[];
}

export class ResolveCompanyRegistrationDto {
  @ApiProperty({ example: 'TRHB-7K9M-P4QX' })
  @IsString()
  @Length(8, 32)
  code!: string;
}
