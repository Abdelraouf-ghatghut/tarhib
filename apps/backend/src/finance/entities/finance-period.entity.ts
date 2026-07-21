import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum FinancePeriodStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

/** Période comptable mensuelle ('YYYY-MM'). Absence de ligne pour un mois =
 * période ouverte — seules les périodes clôturées gagnent une ligne
 * explicite. Une fois clôturée, ses dépenses ne sont plus modifiables/
 * supprimables directement (voir FinanceService) : toute correction passe
 * par une contre-passation (FinanceExpense.reversalOfId). */
@Entity('finance_periods')
export class FinancePeriod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 7, unique: true })
  period!: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: FinancePeriodStatus.OPEN,
  })
  status!: FinancePeriodStatus;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  /** Sub Keycloak de l'acteur ayant clôturé la période. */
  @Column({ name: 'closed_by', type: 'uuid', nullable: true })
  closedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
