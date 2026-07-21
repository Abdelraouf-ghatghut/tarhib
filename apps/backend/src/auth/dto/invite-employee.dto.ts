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

  /** Requis côté service si le rôle choisi est de scope CLIENT. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  /** Détermine le scope (CLIENT/TARHIB) de l'employé créé — source unique
   * de vérité, jamais un champ "scope" séparé fourni par le formulaire. */
  @ApiProperty()
  @IsUUID()
  roleId!: string;
}
