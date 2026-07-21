import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FiscalYear } from './fiscal-year.entity.js';
import { JournalEntryLine } from './journal-entry-line.entity.js';

export enum JournalEntrySource {
  MANUAL = 'MANUAL',
  EXPENSE = 'EXPENSE',
  INVOICE = 'INVOICE',
  PAYROLL = 'PAYROLL',
  DEPRECIATION = 'DEPRECIATION',
  /** Impôt sur les bénéfices généré à la clôture d'exercice (une seule par
   * exercice — voir AccountingService.closeFiscalYear). */
  TAX = 'TAX',
}

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
}

/** Écriture comptable — partie double (voir JournalEntryLine). Une fois
 * `POSTED`, jamais supprimable (loi n°1/2025 — prescription fiscale abolie) :
 * seule une contre-passation (nouvelle écriture) peut la corriger. Le statut
 * DRAFT n'existe que pour l'impôt sur les bénéfices à la clôture d'exercice,
 * relu/ajusté par un comptable avant validation (voir AccountingService). */
@Entity('journal_entries')
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ unique: true })
  reference!: string;

  @Column()
  label!: string;

  @Column({ type: 'varchar', length: 20 })
  source!: JournalEntrySource;

  /** Référence vers l'enregistrement d'origine (FinanceExpense, Invoice,
   * Payslip...) — traçabilité, pas de contrainte FK (polymorphe). */
  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId!: string | null;

  @Column({
    type: 'varchar',
    length: 10,
    default: JournalEntryStatus.POSTED,
  })
  status!: JournalEntryStatus;

  /** Sub Keycloak de l'acteur ayant posté/validé l'écriture. */
  @Column({ name: 'posted_by', type: 'uuid', nullable: true })
  postedBy!: string | null;

  @Column({ name: 'fiscal_year_id', type: 'uuid' })
  fiscalYearId!: string;

  @ManyToOne(() => FiscalYear)
  @JoinColumn({ name: 'fiscal_year_id' })
  fiscalYear!: FiscalYear;

  @OneToMany(() => JournalEntryLine, (line) => line.journalEntry, {
    cascade: true,
  })
  lines!: JournalEntryLine[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
