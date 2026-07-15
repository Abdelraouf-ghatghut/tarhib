import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Matches } from 'class-validator';

export enum OtpChannel {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
}

export enum OtpAppMode {
  EMPLOYEE = 'employee',
  OPERATIONS = 'operations',
}

export class OtpRequestDto {
  @ApiProperty({ example: '+218912345678', description: 'E.164 format' })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phoneNumber must be E.164 format (e.g. +218912345678)',
  })
  phoneNumber!: string;

  @ApiProperty({ enum: OtpChannel, default: OtpChannel.SMS })
  @IsEnum(OtpChannel)
  channel!: OtpChannel;

  @ApiProperty({ enum: OtpAppMode, default: OtpAppMode.EMPLOYEE })
  @IsEnum(OtpAppMode)
  appMode!: OtpAppMode;
}
