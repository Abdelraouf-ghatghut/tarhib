import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
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

  @Column({ name: 'company_id' })
  companyId!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'branch_id' })
  branchId!: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @Column({ name: 'department_id' })
  departmentId!: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department!: Department;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
