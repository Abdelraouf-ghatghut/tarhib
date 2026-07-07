import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';
import { EmployeeScope } from '../entities/employee.entity.js';

/** Un Select vidé côté formulaire peut envoyer "" — traité comme absent. */
const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

/** @deprecated Use dynamic roles via roleId. Kept for Keycloak fallback and seed compatibility. */
export enum EmployeeRole {
  EMPLOYEE = 'EMPLOYEE',
  DEPARTMENT_MANAGER = 'DEPARTMENT_MANAGER',
  INVENTORY_MANAGER = 'INVENTORY_MANAGER',
  HOSPITALITY_AGENT = 'HOSPITALITY_AGENT',
  ADMIN = 'ADMIN',
}

export class CreateEmployeeDto {
  @ApiPropertyOptional({
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0854',
    description:
      "Site d'affectation — requis pour un employé client, optionnel pour le personnel interne Tarhib",
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0853' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0852' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ example: 'محمد' })
  @IsString()
  @MinLength(1)
  firstNameAr!: string;

  @ApiPropertyOptional({
    example: 'Mohamed',
    description: "Optionnel — repli sur l'arabe",
  })
  @IsString()
  @IsOptional()
  firstNameEn?: string;

  @ApiProperty({ example: 'علي' })
  @IsString()
  @MinLength(1)
  lastNameAr!: string;

  @ApiPropertyOptional({
    example: 'Ali',
    description: "Optionnel — repli sur l'arabe",
  })
  @IsString()
  @IsOptional()
  lastNameEn?: string;

  @ApiProperty({ example: 'm.ali@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+218912345678', description: 'Format E.164' })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'phoneNumber must be E.164 format' })
  phoneNumber!: string;

  @ApiPropertyOptional({ description: 'Dynamic role UUID (preferred)' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ enum: EmployeeScope })
  @IsOptional()
  @IsEnum(EmployeeScope)
  scope?: EmployeeScope;

  @ApiPropertyOptional({
    description: 'Mot de passe initial — crée le compte Keycloak associé',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class EmployeeDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty({ nullable: true, type: String })
  @IsOptional()
  @IsUUID()
  companyId!: string | null;

  @ApiProperty({ nullable: true, type: String })
  @IsOptional()
  @IsUUID()
  branchId!: string | null;

  @ApiProperty({ nullable: true, type: String })
  @IsOptional()
  @IsUUID()
  departmentId!: string | null;

  @ApiProperty()
  @IsString()
  firstNameAr!: string;

  @ApiProperty()
  @IsString()
  firstNameEn!: string;

  @ApiProperty()
  @IsString()
  lastNameAr!: string;

  @ApiProperty()
  @IsString()
  lastNameEn!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  phoneNumber!: string;

  @ApiPropertyOptional({ description: 'Dynamic role UUID' })
  roleId!: string | null;

  @ApiPropertyOptional({ description: 'Legacy role string (deprecated)' })
  role!: string;

  @ApiProperty({ enum: EmployeeScope })
  scope!: EmployeeScope;

  @ApiProperty()
  @IsBoolean()
  active!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Identité Keycloak (JwtPayload.sub) — permet de résoudre "qui a fait X" sur les colonnes acteur (createdBy, validatedBy, etc.) qui stockent cet identifiant plutôt que employees.id',
  })
  keycloakId!: string | null;
}
