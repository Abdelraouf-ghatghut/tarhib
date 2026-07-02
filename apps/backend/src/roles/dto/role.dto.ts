import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RoleScope, SlaPriority } from '../entities/role.entity.js';
import { QuotaPeriodType } from '../entities/role-quota.entity.js';

export class RoleQuotaInputDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ enum: QuotaPeriodType })
  @IsEnum(QuotaPeriodType)
  periodType!: QuotaPeriodType;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  maxQuantity!: number;
}

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

  @ApiPropertyOptional({
    example: 'Procurement manager',
    description: 'Optional — Arabic name is used as fallback when absent',
  })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({ enum: RoleScope })
  @IsEnum(RoleScope)
  scope!: RoleScope;

  @ApiPropertyOptional({
    default: SlaPriority.P5,
    description: "Code d'un niveau SLA de l'entreprise (défauts : P1..P5)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  slaPriority?: string;

  @ApiPropertyOptional({
    description: 'Permission keys to assign',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[];

  @ApiPropertyOptional({
    type: [RoleQuotaInputDto],
    description:
      'Quotas du rôle (CLIENT uniquement). quotasEnabled est dérivé automatiquement : au moins 1 quota = activé.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleQuotaInputDto)
  quotas?: RoleQuotaInputDto[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  nameAr?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  nameEn?: string | null;

  @ApiPropertyOptional({
    description: "Code d'un niveau SLA de l'entreprise (défauts : P1..P5)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  slaPriority?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[];

  @ApiPropertyOptional({
    type: [RoleQuotaInputDto],
    description:
      'Remplace intégralement les quotas du rôle. quotasEnabled est dérivé automatiquement.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleQuotaInputDto)
  quotas?: RoleQuotaInputDto[];
}

export class RoleQuotaDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty({ enum: QuotaPeriodType })
  periodType!: QuotaPeriodType;

  @ApiProperty()
  maxQuantity!: number;
}

export class RoleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string | null;

  @ApiProperty()
  nameAr!: string;

  @ApiProperty({ nullable: true, type: String })
  nameEn!: string | null;

  @ApiProperty({ enum: RoleScope })
  scope!: RoleScope;

  @ApiProperty({ description: 'Code du niveau SLA (défauts : P1..P5)' })
  slaPriority!: string;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty()
  quotasEnabled!: boolean;

  @ApiProperty({ type: [String] })
  permissions!: string[];

  @ApiProperty({ type: [RoleQuotaDto] })
  quotas!: RoleQuotaDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
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
