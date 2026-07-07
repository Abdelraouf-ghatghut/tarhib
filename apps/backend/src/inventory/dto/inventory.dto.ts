import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { StockZone } from '../entities/inventory-item.entity.js';

export { StockZone };

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  companyId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0852' })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0853' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ enum: StockZone, default: StockZone.BRANCH })
  @IsEnum(StockZone)
  @IsOptional()
  zone?: StockZone;

  @ApiProperty({ example: 50, minimum: 0 })
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiProperty({ example: 10, minimum: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  minThreshold?: number;

  @ApiProperty({ example: 100, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxThreshold?: number;

  @ApiProperty({ example: 'Frigo — Bureau CFO', required: false })
  @IsString()
  @IsOptional()
  locationName?: string;

  @ApiProperty({
    required: false,
    description: 'Emplacements VIP uniquement — département de rattachement',
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({
    required: false,
    description:
      'Emplacements VIP uniquement — employé auquel cet emplacement est propre',
  })
  @IsUUID()
  @IsOptional()
  assignedEmployeeId?: string;
}

export class UpdateInventoryItemDto {
  @ApiProperty({ example: 50, minimum: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @ApiProperty({ example: 10, minimum: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  minThreshold?: number;

  @ApiProperty({ example: 100, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxThreshold?: number;

  @ApiProperty({ example: 'Frigo — Bureau CFO', required: false })
  @IsString()
  @IsOptional()
  locationName?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  assignedEmployeeId?: string;
}

export class InventoryItemDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0850' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  companyId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0852' })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0853' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ enum: StockZone })
  zone!: StockZone;

  @ApiProperty({ example: 50 })
  quantity!: number;

  @ApiProperty({ example: 10 })
  minThreshold!: number;

  @ApiProperty({ example: 100, nullable: true })
  maxThreshold!: number | null;

  @ApiProperty({ example: 'Frigo — Bureau CFO', nullable: true })
  locationName!: string | null;

  @ApiProperty({ nullable: true })
  departmentId!: string | null;

  @ApiProperty({ nullable: true })
  assignedEmployeeId!: string | null;

  @ApiProperty({ description: 'true when quantity <= minThreshold' })
  belowThreshold!: boolean;
}
