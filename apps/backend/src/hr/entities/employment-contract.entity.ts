import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EmploymentContractType {
  CDI = 'CDI',
  CDD = 'CDD',
}

export enum EmploymentContractStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  RENEWED = 'RENEWED',
}

@Entity('employment_contracts')
export class EmploymentContract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @Column({ type: 'varchar', length: 10 })
  type!: EmploymentContractType;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  /** Nullable si CDI. */
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ name: 'job_title' })
  jobTitle!: string;

  /** Snapshot au moment de la signature — employee.salary peut évoluer
   * ensuite sans réécrire le contrat. */
  @Column({ name: 'base_salary', type: 'decimal', precision: 10, scale: 2 })
  baseSalary!: number;

  @Column({
    type: 'varchar',
    length: 10,
    default: EmploymentContractStatus.ACTIVE,
  })
  status!: EmploymentContractStatus;

  /** S3/MinIO — même stockage que les images produits (voir CLAUDE.md). */
  @Column({ name: 'document_url', type: 'text', nullable: true })
  documentUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
