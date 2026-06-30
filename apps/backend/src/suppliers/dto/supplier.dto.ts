import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class SupplierDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  nameAr!: string;

  @ApiProperty()
  nameEn!: string;

  @ApiProperty({ nullable: true })
  contactName!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty()
  active!: boolean;
}

export class CreateSupplierDto {
  @ApiProperty()
  @IsUUID()
  companyId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  nameEn!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;
}
