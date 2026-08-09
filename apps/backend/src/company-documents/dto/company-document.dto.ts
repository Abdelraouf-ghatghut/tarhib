import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCompanyDocumentDto {
  @ApiProperty({ example: 'عقد التأسيس' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;
}

export class CompanyDocumentDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() documentUrl!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}
