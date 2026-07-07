import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { StockZone } from '../../inventory/entities/inventory-item.entity.js';
import { TransferStatus } from '../entities/inventory-transfer.entity.js';

export class CreateInventoryTransferDto {
  @ApiProperty()
  @IsUUID()
  companyId!: string;

  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ enum: StockZone })
  @IsEnum(StockZone)
  fromZone!: StockZone;

  @ApiProperty({ enum: StockZone })
  @IsEnum(StockZone)
  toZone!: StockZone;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  note?: string;
}

export class InventoryTransferDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  branchId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty({ enum: StockZone })
  fromZone!: StockZone;

  @ApiProperty({ enum: StockZone })
  toZone!: StockZone;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ enum: TransferStatus })
  status!: TransferStatus;

  @ApiProperty()
  requestedBy!: string;

  @ApiProperty({ nullable: true })
  confirmedBy!: string | null;

  @ApiProperty({ nullable: true })
  note!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  confirmedAt!: Date | null;

  @ApiProperty({ nullable: true })
  cancelledBy!: string | null;

  @ApiProperty({ nullable: true })
  cancelledAt!: Date | null;
}
