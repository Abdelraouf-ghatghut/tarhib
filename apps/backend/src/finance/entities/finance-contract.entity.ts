import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContractBillingFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  ONE_TIME = 'ONE_TIME',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

/**
 * Contrat par lequel une société cliente paie Tarhib — le revenu de Tarhib
 * en tant qu'entreprise, distinct de tout ce qui concerne les quotas/budgets
 * des employés (§3.1 CLAUDE.md, sans rapport avec ce module).
 */
@Entity('finance_contracts')
export class FinanceContract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @Column()
  label!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({
    name: 'billing_frequency',
    type: 'varchar',
    length: 20,
    default: ContractBillingFrequency.MONTHLY,
  })
  billingFrequency!: ContractBillingFrequency;

  @Column({
    type: 'varchar',
    length: 20,
    default: ContractStatus.DRAFT,
  })
  status!: ContractStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
