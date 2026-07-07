import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsInt, IsUUID, Min } from 'class-validator';

export class CreateQuotaDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0852' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  periodEnd!: string;

  @ApiProperty({ example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  maxQuantity!: number;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0854' })
  @IsUUID()
  companyId!: string;
}

export class UpdateQuotaDto extends PartialType(CreateQuotaDto) {}

export class QuotaDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0850' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0852' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  periodEnd!: string;

  @ApiProperty({ example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  maxQuantity!: number;

  @ApiProperty({ example: 3, minimum: 0 })
  @IsInt()
  @Min(0)
  usedQuantity!: number;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0854' })
  @IsUUID()
  companyId!: string;
}
