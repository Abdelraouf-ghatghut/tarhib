import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

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

  @ApiProperty({ example: 50 })
  quantity!: number;

  @ApiProperty({ example: 10 })
  minThreshold!: number;

  @ApiProperty({ example: 100, nullable: true })
  maxThreshold!: number | null;

  @ApiProperty({ description: 'true when quantity <= minThreshold' })
  belowThreshold!: boolean;
}
