import { IsEmail, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteEmployeeDto {
  @ApiProperty({ example: 'nouvel.employe@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsUUID()
  companyId!: string;

  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roleId?: string;
}
