import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ExpenseCategory {
  RENT = 'RENT',
  SALARIES = 'SALARIES',
  UTILITIES = 'UTILITIES',
  MARKETING = 'MARKETING',
  OTHER = 'OTHER',
}

/** Frais divers de Tarhib (loyer, salaires, énergie...). companyId optionnel
 * quand le frais est directement imputable à une société cliente ; null pour
 * un frais général Tarhib. */
@Entity('finance_expenses')
export class FinanceExpense {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ExpenseCategory.OTHER,
  })
  category!: ExpenseCategory;

  @Column()
  label!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate!: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId!: string | null;

  /** Lien nominatif employé — n'a de sens que pour category=SALARIES. Une
   * ligne réelle par (employeeId, payrollPeriod) — voir payrollPeriod
   * ci-dessous — la synchronisation bidirectionnelle du mois en cours avec
   * employees.salary passe par ce champ (EmployeesService ↔ FinanceService).
   */
  @Column({ name: 'employee_id', type: 'uuid', nullable: true })
  employeeId!: string | null;

  /** Mois de paie au format 'YYYY-MM' — n'a de sens que pour category=SALARIES
   * et employeeId non nul. Une ligne par (employeeId, payrollPeriod) — index
   * unique partiel en DB (voir migration FinancePayrollPeriod). */
  @Column({
    name: 'payroll_period',
    type: 'varchar',
    length: 7,
    nullable: true,
  })
  payrollPeriod!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  /** Contre-passation : renseigné sur la ligne d'annulation (montant négatif)
   * ET sur la ligne de remplacement d'une correction, toutes deux pointant
   * vers la ligne d'origine qu'elles corrigent — jamais sur celle-ci, qui
   * reste immuable une fois sa période clôturée (voir
   * FinanceService.correctExpense / period-lock.util.ts). */
  @Column({ name: 'reversal_of_id', type: 'uuid', nullable: true })
  reversalOfId!: string | null;

  /** Payée immédiatement (crédite Banque/Caisse en comptabilité générale) ou
   * encore due (crédite Fournisseurs/Personnel à payer) — voir
   * AccountingService.postExpenseEntry(). Défaut true, rétrocompatible. */
  @Column({ default: true })
  paid!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
