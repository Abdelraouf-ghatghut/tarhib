import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({ example: 'eyJhbGci...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGci...' })
  refreshToken!: string;

  @ApiProperty({ example: 900 })
  expiresIn!: number;

  // Enriched employee context — populated after successful login
  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'EMPLOYEE' })
  role?: string;

  @ApiPropertyOptional()
  roleId?: string;

  @ApiPropertyOptional({ enum: ['TARHIB', 'CLIENT'] })
  scope?: string;

  @ApiPropertyOptional({ type: [String] })
  permissions?: string[];

  @ApiPropertyOptional()
  companyId?: string;

  @ApiPropertyOptional()
  branchId?: string;
}
