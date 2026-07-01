import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity.js';

export class CreatePurchaseOrderLineDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  orderedQty!: number;

  @ApiProperty({ required: false, description: 'Coût unitaire interne' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsUUID()
  companyId!: string;

  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  lines!: CreatePurchaseOrderLineDto[];
}

export class ReceiveLineDto {
  @ApiProperty()
  @IsUUID()
  lineId!: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  receivedQty!: number;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [ReceiveLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveLineDto)
  lines!: ReceiveLineDto[];
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

export class PurchaseOrderLineDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  orderedQty!: number;

  @ApiProperty()
  receivedQty!: number;

  @ApiProperty({ nullable: true })
  unitCost!: number | null;

  @ApiProperty({ nullable: true })
  notes!: string | null;
}

export class PurchaseOrderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  branchId!: string;

  @ApiProperty()
  supplierId!: string;

  @ApiProperty({ enum: PurchaseOrderStatus })
  status!: PurchaseOrderStatus;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty({ type: [PurchaseOrderLineDto] })
  lines!: PurchaseOrderLineDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
