import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateMeetingRoomDto {
  @ApiProperty()
  @IsString()
  nameAr!: string;

  @ApiProperty()
  @IsString()
  nameEn!: string;

  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsUUID()
  companyId!: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  amenities?: Record<string, unknown>;
}

export class UpdateMeetingRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  amenities?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateBookingDto {
  @ApiProperty({ description: 'ISO 8601 UTC start time' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ description: 'ISO 8601 UTC end time' })
  @IsDateString()
  endTime!: string;
}

export class OrderMeetingServicesDto {
  @ApiProperty({ description: 'Services to order: { productId: quantity }' })
  @IsObject()
  services!: Record<string, number>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class MeetingRoomDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  branchId!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  nameAr!: string;

  @ApiProperty()
  nameEn!: string;

  @ApiProperty()
  capacity!: number;

  @ApiPropertyOptional()
  amenities!: Record<string, unknown> | null;

  @ApiProperty()
  active!: boolean;
}

export class BookingDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  roomId!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  startTime!: string;

  @ApiProperty()
  endTime!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  services!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;
}
