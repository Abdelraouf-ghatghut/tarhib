import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * L'auto-inscription (register()) ne collecte que l'identité de l'employé —
 * la branche/le département/le rôle sont assignés par l'admin à
 * l'approbation (cf. commentaire dans AuthService.register). Les trois sont
 * requis : un employé client sans rôle ne peut ni commander (quota/catalogue
 * filtrés par rôle) ni être rattaché correctement (EmployeesPage impose la
 * même règle à la création).
 */
export class ApproveRegistrationDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsUUID()
  departmentId!: string;

  @ApiProperty()
  @IsUUID()
  roleId!: string;
}
