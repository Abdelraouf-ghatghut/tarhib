import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInviteDto {
  @ApiProperty()
  @IsString()
  token!: string;

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

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
