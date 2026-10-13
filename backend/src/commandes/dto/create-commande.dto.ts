import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { LigneCommandeDto } from './ligne-commande.dto';

export class CreateCommandeDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins une ligne de commande est requise' })
  @ValidateNested({ each: true })
  @Type(() => LigneCommandeDto)
  lignes: LigneCommandeDto[];

  @IsOptional()
  @IsUUID()
  departement_id?: string;

  @IsOptional()
  @IsUUID()
  service_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  lieu_livraison?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  salle?: string;

  @IsOptional()
  @IsDateString()
  heure_souhaitee?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  commentaire?: string;
}
