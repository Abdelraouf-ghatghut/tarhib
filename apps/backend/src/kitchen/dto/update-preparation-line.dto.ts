import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PreparationLineStatus } from '../../orders/entities/order-line.entity.js';

export class UpdatePreparationLineDto {
  @IsEnum(PreparationLineStatus)
  status!: PreparationLineStatus;
  @IsOptional()
  @IsString()
  @MaxLength(250)
  note?: string;
}
