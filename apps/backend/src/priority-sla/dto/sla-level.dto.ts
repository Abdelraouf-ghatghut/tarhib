import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SlaLevelInputDto {
  @ApiProperty({
    example: 'P1',
    description:
      'Identifiant court libre, unique par entreprise (ex. P1, VIP, URGENT)',
  })
  @IsString()
  @Matches(/^[\p{L}\p{N}_-]{1,20}$/u, {
    message: 'code must be 1-20 letters, digits, dashes or underscores',
  })
  code!: string;

  @ApiPropertyOptional({ example: 'حرج' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameAr?: string;

  @ApiPropertyOptional({ example: 'Critique' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string;

  @ApiProperty({ minimum: 1, example: 15 })
  @IsInt()
  @Min(1)
  targetMinutes!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpsertSlaLevelsDto {
  @ApiProperty({
    type: [SlaLevelInputDto],
    description:
      "Remplace intégralement le set de niveaux de l'entreprise (nombre illimité). " +
      'Un niveau absent du payload est supprimé, sauf si un rôle le référence.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SlaLevelInputDto)
  levels!: SlaLevelInputDto[];
}

export class SlaLevelDto {
  @ApiProperty()
  code!: string;

  @ApiProperty({ nullable: true, type: String })
  nameAr!: string | null;

  @ApiProperty({ nullable: true, type: String })
  nameEn!: string | null;

  @ApiProperty()
  targetMinutes!: number;

  @ApiProperty()
  active!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ description: 'True when no company override exists yet' })
  isDefault!: boolean;
}
