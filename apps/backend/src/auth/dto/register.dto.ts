import { IsEmail, IsString, IsUUID, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'ahmed.benali@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Challenge opaque obtenu après validation du code entreprise',
  })
  @IsString()
  @Length(32, 128)
  challenge!: string;

  @ApiProperty({ description: 'Combinaison branche/département/rôle publiée' })
  @IsUUID()
  registrationOptionId!: string;

  @ApiProperty({
    description: 'Jeton opaque obtenu après vérification OTP du téléphone',
  })
  @IsString()
  @Length(32, 128)
  phoneVerificationToken!: string;

  @ApiProperty()
  @IsString()
  firstNameAr!: string;

  @ApiProperty()
  @IsString()
  firstNameEn!: string;

  @ApiProperty()
  @IsString()
  lastNameAr!: string;

  @ApiProperty()
  @IsString()
  lastNameEn!: string;

  @ApiProperty({ example: '+218912345678' })
  @IsString()
  phoneNumber!: string;
}
