import { IsBooleanString, IsOptional, IsString, IsUUID } from 'class-validator';

export class ListUtilisateursQueryDto {
  @IsOptional()
  @IsBooleanString({ message: 'actif doit être "true" ou "false"' })
  actif?: string;

  @IsOptional()
  @IsUUID()
  site_id?: string;

  @IsOptional()
  @IsString()
  role_code?: string;
}
