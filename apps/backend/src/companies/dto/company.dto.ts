import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'سوناطراك' })
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiPropertyOptional({
    example: 'Sonatrach SA',
    description: "Anglais optionnel — l'arabe sert de repli",
  })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({
    example: 'sonatrach-sa',
    description: 'Identifiant URL-safe unique (kebab-case)',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must only contain lowercase letters, digits and hyphens',
  })
  slug!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'سوناطراك' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameAr?: string;

  @ApiPropertyOptional({ example: 'Sonatrach SA' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameEn?: string;

  @ApiPropertyOptional({ example: 'sonatrach-sa' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must only contain lowercase letters, digits and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CompanyDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'Sonatrach SA' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'سوناطراك' })
  @IsString()
  nameAr!: string;

  @ApiProperty({ example: 'Sonatrach SA' })
  @IsString()
  nameEn!: string;

  @ApiProperty({ example: 'sonatrach-sa' })
  @IsString()
  slug!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  active!: boolean;
}
