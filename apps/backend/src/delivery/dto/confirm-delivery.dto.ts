import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ConfirmDeliveryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  recipientName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  recipientCode?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  clientRequestId!: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
