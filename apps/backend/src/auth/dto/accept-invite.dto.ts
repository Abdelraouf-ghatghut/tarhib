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

  @ApiProperty({ example: '+213555000000' })
  @IsString()
  phoneNumber!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
