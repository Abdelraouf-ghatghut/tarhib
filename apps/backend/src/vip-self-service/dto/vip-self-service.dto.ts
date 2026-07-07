import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { VipTaskStatus } from '../entities/vip-replenishment-task.entity.js';

/**
 * DTO plat, un élément par produit — contrat préservé pour l'app mobile
 * existante (apps/mobile/lib/screens/agent/vip_stock_screen.dart), qui
 * traite chaque produit-dans-un-lieu comme "un emplacement". `id` reste
 * l'identifiant à utiliser pour PATCH .../locations/:id/replenish.
 * `vipLocationId` est un ajout additif (le mobile l'ignore) qui permet au
 * web-admin de regrouper les lignes appartenant au même lieu physique.
 */
export class VipLocationDto {
  @ApiProperty({
    description: 'id du VipLocationProduct (produit dans ce lieu)',
  })
  id!: string;

  @ApiProperty()
  vipLocationId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  productNameAr!: string;

  @ApiProperty()
  productNameEn!: string;

  @ApiProperty({ nullable: true })
  locationName!: string | null;

  @ApiProperty()
  branchId!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ nullable: true })
  departmentId!: string | null;

  @ApiProperty({ nullable: true })
  assignedEmployeeId!: string | null;

  @ApiProperty()
  currentStock!: number;

  @ApiProperty()
  minThreshold!: number;

  @ApiProperty({ nullable: true })
  maxThreshold!: number | null;

  @ApiProperty()
  belowThreshold!: boolean;

  @ApiProperty({ nullable: true })
  openTaskId!: string | null;
}

export class VipLocationProductInputDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  minThreshold?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxThreshold?: number;
}

export class CreateVipLocationDto {
  @ApiProperty()
  @IsUUID()
  companyId!: string;

  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Employé auquel cet emplacement est propre (frigo personnel…)',
  })
  @IsUUID()
  @IsOptional()
  assignedEmployeeId?: string;

  @ApiPropertyOptional({ example: 'Frigo — Bureau CFO' })
  @IsString()
  @IsOptional()
  locationName?: string;

  @ApiProperty({
    type: [VipLocationProductInputDto],
    description: 'Au moins un produit initial dans ce lieu',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VipLocationProductInputDto)
  products!: VipLocationProductInputDto[];
}

export class AddVipLocationProductDto extends VipLocationProductInputDto {}

export class AdjustVipLocationProductDto {
  @ApiPropertyOptional({ minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  minThreshold?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxThreshold?: number;
}

export class VipReplenishmentTaskDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  vipLocationProductId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  branchId!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ nullable: true })
  locationName!: string | null;

  @ApiProperty()
  requestedQty!: number;

  @ApiProperty({ enum: VipTaskStatus })
  status!: VipTaskStatus;

  @ApiProperty({ nullable: true })
  assignedAgentId!: string | null;

  @ApiProperty({ nullable: true })
  completedBy!: string | null;

  @ApiProperty({ nullable: true })
  completedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}
