import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { VipTaskStatus } from '../entities/vip-replenishment-task.entity.js';
import { StockZone } from '../../inventory/entities/inventory-item.entity.js';

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

/**
 * Zone d'où provient le stock déplacé vers l'emplacement VIP. CENTRAL
 * n'est jamais accepté ici : y accéder implique un transfert physique avec
 * délai (voir inventory-transfers), pas une réappro instantanée — l'agent
 * doit d'abord faire arriver le stock en BRANCH, puis relancer la réappro.
 * Entre KITCHEN et BRANCH, la zone effective est en plus bornée par les
 * permissions stock de l'appelant (VipSelfServiceService.resolveSourceZone).
 * Défaut KITCHEN si omis.
 */
export class ReplenishSourceDto {
  @ApiPropertyOptional({
    enum: StockZone,
    default: StockZone.KITCHEN,
    description:
      "CENTRAL refusé (transfert physique avec délai — passer par inventory-transfers d'abord). Restreint en plus aux zones accessibles à l'appelant (stock.kitchen.view seul → KITCHEN uniquement).",
  })
  @IsEnum(StockZone)
  @IsOptional()
  sourceZone?: StockZone;
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
