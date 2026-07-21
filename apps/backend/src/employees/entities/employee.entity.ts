import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity.js';
import { Branch } from '../../branches/entities/branch.entity.js';
import { Company } from '../../companies/entities/company.entity.js';
import { Role } from '../../roles/entities/role.entity.js';

export enum EmployeeScope {
  TARHIB = 'TARHIB',
  CLIENT = 'CLIENT',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING', // self-registered, awaiting admin approval
  INVITED = 'INVITED', // invited by admin, awaiting password setup
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'keycloak_id',
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  keycloakId!: string | null;

  /**
   * Site d'affectation (société cliente + branche) : obligatoire pour les
   * employés clients, optionnel pour le personnel interne Tarhib qui est
   * dispatché en mission (le superadmin n'est affecté nulle part).
   */
  @Column({ name: 'company_id', nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company!: Company | null;

  @Column({ name: 'branch_id', nullable: true })
  branchId!: string | null;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch | null;

  @Column({ name: 'department_id', nullable: true })
  departmentId!: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department!: Department | null;

  /**
   * Emplacement physique dans le site d'affectation (étage + numéro de
   * bureau) — renseigné pour les employés clients, pas de sens pour le
   * personnel interne Tarhib en mission.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  floor!: string | null;

  @Column({
    name: 'office_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  officeNumber!: string | null;

  @Column({ name: 'first_name_ar' })
  firstNameAr!: string;

  @Column({ name: 'first_name_en' })
  firstNameEn!: string;

  @Column({ name: 'last_name_ar' })
  lastNameAr!: string;

  @Column({ name: 'last_name_en' })
  lastNameEn!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'phone_number', unique: true })
  phoneNumber!: string;

  /** Legacy role string — kept for backward compat and Keycloak fallback */
  @Column({ type: 'varchar', length: 50, nullable: true })
  role!: string;

  /** Dynamic role FK — primary RBAC source */
  @Column({ name: 'role_id', type: 'uuid', nullable: true })
  roleId!: string | null;

  @ManyToOne(() => Role, { nullable: true, eager: false })
  @JoinColumn({ name: 'role_id' })
  dynamicRole!: Role | null;

  /**
   * Rôles additionnels pour le personnel multi-casquette. Le rôle principal
   * reste `role_id`; ces rôles s'additionnent pour les permissions/modules.
   */
  @ManyToMany(() => Role, { eager: false })
  @JoinTable({
    name: 'employee_roles',
    joinColumn: { name: 'employee_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  additionalRoles!: Role[];

  @Column({
    type: 'varchar',
    length: 20,
    default: EmployeeScope.CLIENT,
    nullable: true,
  })
  scope!: EmployeeScope;

  @Column({ default: true })
  active!: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: EmployeeStatus.ACTIVE,
  })
  status!: EmployeeStatus;

  @Column({ name: 'fcm_token', type: 'text', nullable: true })
  fcmToken!: string | null;

  /**
   * Salaire — donnée sensible, personnel interne Tarhib uniquement. Jamais
   * exposé via EmployeeDto/toDto() : seul EmployeeAdminDto/toAdminDto()
   * (réservés au Super Admin, permission employee.salary.manage) l'incluent.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salary!: number | null;

  /** Date de prise de fonction — point de départ de la génération de paie
   * mensuelle (FinancePayrollService). Null = pas de proratisation possible,
   * le mois de première génération est compté en entier. */
  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
