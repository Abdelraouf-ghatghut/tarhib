import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Min } from 'class-validator';

export enum AdjustmentType {
  SORTIE = 'SORTIE',
  AJUSTEMENT = 'AJUSTEMENT',
}

export class InventoryAdjustmentDto {
  @ApiProperty({ enum: AdjustmentType })
  @IsEnum(AdjustmentType)
  type!: AdjustmentType;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  quantity!: number; // Pour SORTIE: montant à retirer. Pour AJUSTEMENT: valeur absolue.

  @ApiProperty()
  @IsString()
  reason!: string;
}
