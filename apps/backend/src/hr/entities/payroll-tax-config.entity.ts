import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Barème fiscal libyen (loi n°7/2010) appliqué au calcul des bulletins de
 * paie — une seule ligne modifiable (pas d'historique versionné, pour rester
 * simple). Tous les taux sont des pourcentages (5 = 5%). Seedée avec les
 * valeurs de référence à la migration — voir PayslipService.compute.
 */
@Entity('payroll_tax_configs')
export class PayrollTaxConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'income_tax_bracket1_rate',
    type: 'decimal',
    precision: 5,
    scale: 3,
    default: 5,
  })
  incomeTaxBracket1Rate!: number;

  @Column({
    name: 'income_tax_bracket1_ceiling',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 1000,
  })
  incomeTaxBracket1Ceiling!: number;

  @Column({
    name: 'income_tax_bracket2_rate',
    type: 'decimal',
    precision: 5,
    scale: 3,
    default: 10,
  })
  incomeTaxBracket2Rate!: number;

  /** Montant exact non fourni par la loi telle que citée — défaut 0 (pas
   * d'exonération) tant que non renseigné. */
  @Column({
    name: 'personal_exemption_threshold',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  personalExemptionThreshold!: number;

  @Column({
    name: 'jihad_tax_individual_rate',
    type: 'decimal',
    precision: 5,
    scale: 3,
    default: 3,
  })
  jihadTaxIndividualRate!: number;

  @Column({
    name: 'solidarity_fund_rate',
    type: 'decimal',
    precision: 5,
    scale: 3,
    default: 1,
  })
  solidarityFundRate!: number;

  @Column({
    name: 'payroll_stamp_duty_rate',
    type: 'decimal',
    precision: 5,
    scale: 3,
    default: 0.5,
  })
  payrollStampDutyRate!: number;

  @Column({
    name: 'cnss_employee_rate',
    type: 'decimal',
    precision: 5,
    scale: 3,
    default: 5.125,
  })
  cnssEmployeeRate!: number;

  @Column({
    name: 'cnss_employer_rate',
    type: 'decimal',
    precision: 5,
    scale: 3,
    default: 14.35,
  })
  cnssEmployerRate!: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
