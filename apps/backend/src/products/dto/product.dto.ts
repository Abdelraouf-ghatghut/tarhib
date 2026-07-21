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

  @ApiPropertyOptional({ example: 'Coffee', nullable: true })
  @IsString()
  @IsOptional()
  nameEn?: string | null;

  @ApiProperty({ example: 'beverages' })
  @IsString()
  category!: string;

  /** @deprecated remplacé par isSold/isPurchased/isVipSelfService */
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

  @ApiProperty({ example: true, description: 'Acheté auprès d’un fournisseur' })
  @IsBoolean()
  isPurchased!: boolean;

  @ApiProperty({ example: true, description: 'Vendu au catalogue employé' })
  @IsBoolean()
  isSold!: boolean;

  @ApiProperty({
    example: false,
    description: 'Libre-service VIP (jamais commandable)',
  })
  @IsBoolean()
  isVipSelfService!: boolean;

  @ApiPropertyOptional({
    example: 'g',
    description: 'Unité de stock/recette ("g", "ml", "unité")',
  })
  @IsString()
  @IsOptional()
  unit?: string | null;

  @ApiPropertyOptional({
    example: 'sac',
    description: 'Unité d’achat fournisseur, si différente de `unit`',
  })
  @IsString()
  @IsOptional()
  purchaseUnit?: string | null;

  @ApiProperty({
    example: 1,
    description: 'Unités de stock par unité d’achat (ex. 1 sac = 1000g → 1000)',
  })
  @IsNumber()
  @Min(1)
  unitsPerPurchase!: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'قهوة' })
  @IsString()
  @MinLength(1)
  nameAr!: string;

  @ApiPropertyOptional({ example: 'Coffee', nullable: true })
  @IsString()
  @IsOptional()
  nameEn?: string | null;

  @ApiProperty({ example: 'beverages' })
  @IsString()
  category!: string;

  /** @deprecated remplacé par isSold/isPurchased/isVipSelfService — si isSold/isPurchased/isVipSelfService sont omis, ils sont dérivés de ce champ */
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

  @ApiPropertyOptional({ description: 'Défaut dérivé de `type` si omis' })
  @IsBoolean()
  @IsOptional()
  isPurchased?: boolean;

  @ApiPropertyOptional({ description: 'Défaut dérivé de `type` si omis' })
  @IsBoolean()
  @IsOptional()
  isSold?: boolean;

  @ApiPropertyOptional({ description: 'Défaut dérivé de `type` si omis' })
  @IsBoolean()
  @IsOptional()
  isVipSelfService?: boolean;

  @ApiProperty({
    required: false,
    example: 12.5,
    description: 'Coût interne — jamais exposé côté catalogue employé',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @ApiPropertyOptional({
    example: 'g',
    description: 'Unité de stock/recette ("g", "ml", "unité")',
  })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({
    example: 'sac',
    description: 'Unité d’achat fournisseur, si différente de `unit`',
  })
  @IsString()
  @IsOptional()
  purchaseUnit?: string;

  @ApiPropertyOptional({
    example: 1000,
    description:
      'Unités de stock par unité d’achat (ex. 1 sac = 1000g → 1000) — défaut 1 (pas de conversion) si omis',
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  unitsPerPurchase?: number;
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

/**
 * Nomenclature (BOM) : `quantity` unités de `ingredientProductId` consommées
 * par unité vendue du produit parent — pas de conversion, même unité que le
 * stock de l'ingrédient.
 */
export class RecipeLineDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  ingredientProductId!: string;

  @ApiProperty({ example: 7 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateRecipeLineDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  ingredientProductId!: string;

  @ApiProperty({ example: 7 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}
