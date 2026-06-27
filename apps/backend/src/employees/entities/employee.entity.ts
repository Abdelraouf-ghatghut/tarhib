import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmployeeRole } from '../dto/employee.dto.js';
import { Department } from '../../departments/entities/department.entity.js';
import { Branch } from '../../branches/entities/branch.entity.js';
import { Company } from '../../companies/entities/company.entity.js';

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

  @Column({ type: 'varchar', length: 50 })
  role!: EmployeeRole;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
