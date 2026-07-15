import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Length, Matches } from 'class-validator';
import { OtpAppMode } from './otp-request.dto';

export class OtpVerifyDto {
  @ApiProperty({ example: '+218912345678', description: 'E.164 format' })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phoneNumber must be E.164 format',
  })
  phoneNumber!: string;

  @ApiProperty({ example: '847291', description: '6-digit OTP code' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;

  @ApiProperty({ enum: OtpAppMode, default: OtpAppMode.EMPLOYEE })
  @IsEnum(OtpAppMode)
  appMode!: OtpAppMode;
}
