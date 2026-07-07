import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0854' })
  @IsUUID()
  companyId!: string;

  @ApiProperty({ example: 'فرع الجزائر العاصمة' })
  @IsString()
  @MinLength(1)
  nameAr!: string;

  @ApiPropertyOptional({
    example: 'Algiers HQ',
    description: "Anglais optionnel — l'arabe sert de repli",
  })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiPropertyOptional({
    description:
      "Chaîne d'achat — employé responsable stock qui crée les demandes d'achat",
  })
  @IsUUID()
  @IsOptional()
  stockResponsibleId?: string;

  @ApiPropertyOptional({
    description: "Chaîne d'achat — employé qui valide les demandes d'achat",
  })
  @IsUUID()
  @IsOptional()
  orderValidatorId?: string;

  @ApiPropertyOptional({
    description:
      "Chaîne d'achat — employé responsable achats qui achète et livre",
  })
  @IsUUID()
  @IsOptional()
  purchasingManagerId?: string;
}

export class BranchDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0854' })
  @IsUUID()
  companyId!: string;

  @ApiProperty({ example: 'فرع الجزائر العاصمة' })
  @IsString()
  nameAr!: string;

  @ApiProperty({ example: 'Algiers HQ' })
  @IsString()
  nameEn!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  active!: boolean;

  @ApiProperty({ nullable: true })
  stockResponsibleId!: string | null;

  @ApiProperty({ nullable: true })
  orderValidatorId!: string | null;

  @ApiProperty({ nullable: true })
  purchasingManagerId!: string | null;
}
