import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { RoleScope, SlaPriority } from '../entities/role.entity.js';

export class CreateRoleDto {
  @ApiPropertyOptional({
    description: 'NULL = Tarhib role, UUID = client company role',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty({ example: 'مدير المشتريات' })
  @IsString()
  @MinLength(1)
  nameAr!: string;

  @ApiProperty({ example: 'Responsable achats' })
  @IsString()
  @MinLength(1)
  nameEn!: string;

  @ApiProperty({ enum: RoleScope })
  @IsEnum(RoleScope)
  scope!: RoleScope;

  @ApiPropertyOptional({ enum: SlaPriority, default: SlaPriority.P5 })
  @IsOptional()
  @IsEnum(SlaPriority)
  slaPriority?: SlaPriority;

  @ApiPropertyOptional({
    description: 'Enable quota enforcement for this role',
  })
  @IsOptional()
  quotasEnabled?: boolean;

  @ApiProperty({ description: 'Permission keys to assign', type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissionKeys!: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  nameEn?: string;

  @ApiPropertyOptional({ enum: SlaPriority })
  @IsOptional()
  @IsEnum(SlaPriority)
  slaPriority?: SlaPriority;

  @ApiPropertyOptional()
  @IsOptional()
  quotasEnabled?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[];
}

export class RoleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string | null;

  @ApiProperty()
  nameAr!: string;

  @ApiProperty()
  nameEn!: string;

  @ApiProperty({ enum: RoleScope })
  scope!: RoleScope;

  @ApiProperty({ enum: SlaPriority })
  slaPriority!: SlaPriority;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty()
  quotasEnabled!: boolean;

  @ApiProperty({ type: [String] })
  permissions!: string[];
}

export class CreateRoleQuotaDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ enum: ['DAILY', 'WEEKLY', 'MONTHLY'] })
  @IsString()
  periodType!: string;

  @ApiProperty({ minimum: 1 })
  maxQuantity!: number;
}
