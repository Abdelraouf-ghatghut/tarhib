import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SupplierDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nameAr!: string;

  @ApiProperty()
  nameEn!: string;

  @ApiProperty({ nullable: true })
  contactName!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty()
  active!: boolean;
}

export class CreateSupplierDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiPropertyOptional({ description: "Anglais optionnel — repli sur l'arabe" })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;
}

export class ProductPriceInputDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 12.5 })
  @IsNumber()
  @Min(0)
  unitCost!: number;
}

export class ProductPriceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  supplierId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  unitCost!: number;
}

export class SetProductPricesDto {
  @ApiProperty({ type: [ProductPriceInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceInputDto)
  prices!: ProductPriceInputDto[];
}
