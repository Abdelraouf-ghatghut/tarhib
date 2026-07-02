import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SlaPriority } from '../../roles/entities/role.entity.js';

export class SlaLevelInputDto {
  @ApiProperty({ enum: SlaPriority })
  @IsEnum(SlaPriority)
  code!: SlaPriority;

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
}

export class UpsertSlaLevelsDto {
  @ApiProperty({ type: [SlaLevelInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => SlaLevelInputDto)
  levels!: SlaLevelInputDto[];
}

export class SlaLevelDto {
  @ApiProperty({ enum: SlaPriority })
  code!: SlaPriority;

  @ApiProperty({ nullable: true, type: String })
  nameAr!: string | null;

  @ApiProperty({ nullable: true, type: String })
  nameEn!: string | null;

  @ApiProperty()
  targetMinutes!: number;

  @ApiProperty()
  active!: boolean;

  @ApiProperty({ description: 'True when no company override exists yet' })
  isDefault!: boolean;
}
