import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class OtpRequestDto {
  @ApiProperty({ example: '+213555000000', description: 'E.164 format' })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phoneNumber must be E.164 format (e.g. +213555000000)',
  })
  phoneNumber!: string;
}
