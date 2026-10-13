import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from "class-validator";

export enum ProductType {
  COMMANDABLE = "COMMANDABLE",
  LIBRE_SERVICE_VIP = "LIBRE_SERVICE_VIP",
}

export class ProductDto {
  @ApiProperty({ example: "d290f1ee-6c54-4b01-90e6-d701748f0851" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "قهوة" })
  @IsString()
  @MinLength(1)
  nameAr!: string;

  @ApiProperty({ example: "Coffee" })
  @IsString()
  @MinLength(1)
  nameEn!: string;

  @ApiProperty({ example: "beverages" })
  @IsString()
  category!: string;

  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  type!: ProductType;

  @ApiProperty({ type: [String], required: false, example: ["EMPLOYEE", "DEPARTMENT_MANAGER"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedRoles?: string[];

  @ApiProperty({ example: true })
  @IsBoolean()
  active!: boolean;
}

export class CreateProductDto {
  @ApiProperty({ example: "قهوة" })
  @IsString()
  @MinLength(1)
  nameAr!: string;

  @ApiProperty({ example: "Coffee" })
  @IsString()
  @MinLength(1)
  nameEn!: string;

  @ApiProperty({ example: "beverages" })
  @IsString()
  category!: string;

  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  type!: ProductType;

  @ApiProperty({ type: [String], required: false, example: ["EMPLOYEE", "DEPARTMENT_MANAGER"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedRoles?: string[];

  @ApiProperty({ required: false, example: "https://cdn.example.com/coffee.jpg" })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
