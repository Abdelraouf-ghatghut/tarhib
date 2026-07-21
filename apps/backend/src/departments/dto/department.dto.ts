import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0854' })
  @IsUUID()
  companyId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0853' })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: 'قسم المالية' })
  @IsString()
  @MinLength(1)
  nameAr!: string;

  @ApiPropertyOptional({ example: 'Finance Department', nullable: true })
  @IsString()
  @IsOptional()
  nameEn?: string | null;
}

export class DepartmentDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0854' })
  @IsUUID()
  companyId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0853' })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: 'قسم المالية' })
  @IsString()
  nameAr!: string;

  @ApiProperty({ example: 'Finance Department', nullable: true })
  nameEn!: string | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  active!: boolean;
}
