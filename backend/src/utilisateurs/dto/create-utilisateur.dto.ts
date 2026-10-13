import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUtilisateurDto {
  @IsNotEmpty({ message: 'Nom requis' })
  @IsString()
  @MaxLength(100)
  nom: string;

  @IsNotEmpty({ message: 'Prénom requis' })
  @IsString()
  @MaxLength(100)
  prenom: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @IsNotEmpty({ message: 'Mot de passe requis' })
  @IsString()
  @MinLength(8, { message: 'Mot de passe trop court' })
  mot_de_passe: string;

  @IsNotEmpty({ message: 'Rôle requis' })
  @IsUUID()
  role_id: string;

  @IsOptional()
  @IsUUID()
  site_id?: string;

  @IsOptional()
  @IsUUID()
  departement_id?: string;
}
