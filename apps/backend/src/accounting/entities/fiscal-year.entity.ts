import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum FiscalYearStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

/** Exercice comptable annuel — même principe que FinancePeriod (mensuel)
 * mais à l'échelle de l'année : une fois clôturé, aucune écriture datée
 * dedans n'est postable/modifiable (voir AccountingService). */
@Entity('fiscal_years')
export class FiscalYear {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', unique: true })
  year!: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ type: 'varchar', length: 10, default: FiscalYearStatus.OPEN })
  status!: FiscalYearStatus;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  /** Sub Keycloak de l'acteur ayant clôturé l'exercice. */
  @Column({ name: 'closed_by', type: 'uuid', nullable: true })
  closedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
