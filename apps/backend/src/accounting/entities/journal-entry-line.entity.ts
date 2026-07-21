import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JournalEntry } from './journal-entry.entity.js';
import { ChartOfAccount } from './chart-of-account.entity.js';

/** Ligne d'écriture — débit ou crédit d'un compte. La somme des débits doit
 * égaler la somme des crédits sur l'ensemble des lignes d'une même
 * JournalEntry (vérifié applicativement par AccountingService.postEntry). */
@Entity('journal_entry_lines')
export class JournalEntryLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'journal_entry_id', type: 'uuid' })
  journalEntryId!: string;

  @ManyToOne(() => JournalEntry, (entry) => entry.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'journal_entry_id' })
  journalEntry!: JournalEntry;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @ManyToOne(() => ChartOfAccount)
  @JoinColumn({ name: 'account_id' })
  account!: ChartOfAccount;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  debit!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  credit!: number;

  @Column({ type: 'text', nullable: true })
  label!: string | null;

  /** Dimension analytique — quel client concerné, sans lien financier
   * obligatoire (même logique que FinanceExpense.companyId). */
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId!: string | null;
}
