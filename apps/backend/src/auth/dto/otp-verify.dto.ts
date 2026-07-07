import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

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
  code!: string;
}
