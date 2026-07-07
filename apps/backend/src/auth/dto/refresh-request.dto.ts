import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Corps de /auth/refresh et /auth/logout. Le token est optionnel : le web
 * l'envoie via le cookie HttpOnly `tarhib_rt`, seule l'app mobile le passe
 * dans le body.
 */
export class RefreshRequestDto {
  @ApiPropertyOptional({ example: 'eyJhbGci...' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  refreshToken?: string;
}
