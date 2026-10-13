import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email ou téléphone requis' })
  @IsString()
  identifiant: string;

  @IsNotEmpty({ message: 'Mot de passe requis' })
  @IsString()
  @MinLength(8, { message: 'Mot de passe trop court' })
  mot_de_passe: string;
}
