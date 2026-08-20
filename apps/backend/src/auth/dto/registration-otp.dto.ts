import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Length, Matches } from 'class-validator';
import { OtpChannel } from './otp-request.dto.js';

export class RegistrationOtpRequestDto {
  @ApiProperty()
  @IsString()
  @Length(32, 128)
  challenge!: string;

  @ApiProperty({ example: '+218912345678' })
  @Matches(/^\+[1-9]\d{7,14}$/)
  phoneNumber!: string;

  @ApiProperty({ enum: OtpChannel })
  @IsEnum(OtpChannel)
  channel!: OtpChannel;
}

export class RegistrationOtpVerifyDto {
  @ApiProperty()
  @IsString()
  @Length(32, 128)
  challenge!: string;

  @ApiProperty({ example: '+218912345678' })
  @Matches(/^\+[1-9]\d{7,14}$/)
  phoneNumber!: string;

  @ApiProperty({ example: '847291' })
  @Matches(/^\d{6}$/)
  code!: string;
}
