import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Bulletin de paie — jamais supprimable une fois généré (loi n°1/2025,
 * prescription fiscale abolie), même règle de conservation que les écritures
 * comptables et les factures. Lié 1-1 à la ligne FinanceExpense SALARIES
 * générée par FinancePayrollService (pas de relation TypeORM — simple uuid,
 * cross-module, même convention que JournalEntry.sourceId). */
@Entity('payslips')
export class Payslip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @Column({ type: 'varchar', length: 7 })
  period!: string;

  @Column({ name: 'gross_salary', type: 'decimal', precision: 10, scale: 2 })
  grossSalary!: number;

  @Column({
    name: 'cnss_employee_contribution',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  cnssEmployeeContribution!: number;

  /** Mémo informatif — charge patronale additionnelle, jamais retenue sur le
   * salarié (voir plan §2). */
  @Column({
    name: 'cnss_employer_contribution',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  cnssEmployerContribution!: number;

  @Column({
    name: 'solidarity_fund_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  solidarityFundAmount!: number;

  @Column({
    name: 'jihad_tax_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  jihadTaxAmount!: number;

  @Column({
    name: 'income_tax_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  incomeTaxAmount!: number;

  @Column({
    name: 'stamp_duty_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  stampDutyAmount!: number;

  @Column({ name: 'net_pay', type: 'decimal', precision: 10, scale: 2 })
  netPay!: number;

  @Column({ name: 'expense_id', type: 'uuid', unique: true })
  expenseId!: string;

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt!: Date;
}
