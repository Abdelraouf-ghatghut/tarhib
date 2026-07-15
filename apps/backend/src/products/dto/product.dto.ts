import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export enum ProductType {
  COMMANDABLE = 'COMMANDABLE',
  LIBRE_SERVICE_VIP = 'LIBRE_SERVICE_VIP',
}

export class ProductDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'قهوة' })
  @IsString()
  @MinLength(1)
  nameAr!: string;

  @ApiPropertyOptional({
    example: 'Coffee',
    description: "Nom anglais optionnel — l'arabe sert de repli",
  })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({ example: 'beverages' })
  @IsString()
  category!: string;

  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  type!: ProductType;

  @ApiProperty({
    type: [String],
    required: false,
    example: ['EMPLOYEE', 'DEPARTMENT_MANAGER'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedRoles?: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description:
      'UUID des branches où ce produit est commandable — vide/absent = aucune restriction (commandable partout)',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedBranches?: string[];

  @ApiProperty({ example: true })
  @IsBoolean()
  active!: boolean;
}

export class CreateProductDto {
  @ApiProperty({ example: 'قهوة' })
  @IsString()
  @MinLength(1)
  nameAr!: string;

  @ApiPropertyOptional({
    example: 'Coffee',
    description: "Nom anglais optionnel — l'arabe sert de repli",
  })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({ example: 'beverages' })
  @IsString()
  category!: string;

  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  type!: ProductType;

  @ApiProperty({
    type: [String],
    required: false,
    example: ['EMPLOYEE', 'DEPARTMENT_MANAGER'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedRoles?: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description:
      'UUID des branches où ce produit est commandable — vide/absent = aucune restriction (commandable partout)',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedBranches?: string[];

  @ApiProperty({
    required: false,
    example: 'https://cdn.example.com/coffee.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    required: false,
    example: 12.5,
    description: 'Coût interne — jamais exposé côté catalogue employé',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitCost?: number;
}

/**
 * DTO admin uniquement — inclut unitCost (prix interne fournisseur).
 * Ne jamais utiliser pour les endpoints accessibles aux employés clients.
 */
export class ProductAdminDto extends ProductDto {
  @ApiProperty({ nullable: true })
  unitCost!: number | null;
}

/**
 * Disponibilité stock d'un produit pour le site (société + branche) de
 * l'appelant — utilisée par le catalogue mobile pour afficher un indicateur
 * "غير متوفر" avant toute tentative de commande (§3.3.2 CLAUDE.md).
 */
export class ProductAvailabilityDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  available!: boolean;
}
