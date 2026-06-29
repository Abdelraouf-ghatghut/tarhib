import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServicePackageType } from '../entities/meeting-service-package.entity';

export class CreateMeetingServicePackageDto {
  @ApiProperty()
  @IsUUID()
  companyId!: string;

  @ApiProperty({ example: 'إفطار + خدمة' })
  @IsString()
  nameAr!: string;

  @ApiProperty({ example: 'Breakfast + service' })
  @IsString()
  nameEn!: string;

  @ApiPropertyOptional({
    enum: ServicePackageType,
    default: ServicePackageType.CUSTOM,
  })
  @IsOptional()
  @IsEnum(ServicePackageType)
  type?: ServicePackageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;
}

export class UpdateMeetingServicePackageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ enum: ServicePackageType })
  @IsOptional()
  @IsEnum(ServicePackageType)
  type?: ServicePackageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
