import { MigrationInterface, QueryRunner } from 'typeorm';

/** RH complète — congés, bulletins de paie (barème fiscal libyen, loi
 * n°7/2010), contrats de travail, évaluations de performance. Voir
 * apps/backend/src/hr/. Payslip suit la même règle de non-suppression que
 * JournalEntry/Invoice/FiscalYear (loi n°1/2025). */
export class Hr1782500540000 implements MigrationInterface {
  name = 'Hr1782500540000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        default_days_per_year DECIMAL(5,1) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL,
        leave_type_id UUID NOT NULL REFERENCES leave_types(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days_count DECIMAL(5,1) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        approver_id UUID,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL,
        leave_type_id UUID NOT NULL REFERENCES leave_types(id),
        year INT NOT NULL,
        entitled DECIMAL(5,1) NOT NULL,
        taken DECIMAL(5,1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (employee_id, leave_type_id, year)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payroll_tax_configs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        income_tax_bracket1_rate DECIMAL(5,3) NOT NULL DEFAULT 5,
        income_tax_bracket1_ceiling DECIMAL(10,2) NOT NULL DEFAULT 1000,
        income_tax_bracket2_rate DECIMAL(5,3) NOT NULL DEFAULT 10,
        personal_exemption_threshold DECIMAL(10,2) NOT NULL DEFAULT 0,
        jihad_tax_individual_rate DECIMAL(5,3) NOT NULL DEFAULT 3,
        solidarity_fund_rate DECIMAL(5,3) NOT NULL DEFAULT 1,
        payroll_stamp_duty_rate DECIMAL(5,3) NOT NULL DEFAULT 0.5,
        cnss_employee_rate DECIMAL(5,3) NOT NULL DEFAULT 5.125,
        cnss_employer_rate DECIMAL(5,3) NOT NULL DEFAULT 14.35,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payslips (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL,
        period VARCHAR(7) NOT NULL,
        gross_salary DECIMAL(10,2) NOT NULL,
        cnss_employee_contribution DECIMAL(10,2) NOT NULL,
        cnss_employer_contribution DECIMAL(10,2) NOT NULL,
        solidarity_fund_amount DECIMAL(10,2) NOT NULL,
        jihad_tax_amount DECIMAL(10,2) NOT NULL,
        income_tax_amount DECIMAL(10,2) NOT NULL,
        stamp_duty_amount DECIMAL(10,2) NOT NULL,
        net_pay DECIMAL(10,2) NOT NULL,
        expense_id UUID NOT NULL UNIQUE,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employment_contracts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL,
        type VARCHAR(10) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        job_title VARCHAR(255) NOT NULL,
        base_salary DECIMAL(10,2) NOT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
        document_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS performance_reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL,
        reviewer_id UUID NOT NULL,
        review_date DATE NOT NULL,
        rating INT NOT NULL,
        strengths TEXT,
        areas_for_improvement TEXT,
        comments TEXT,
        status VARCHAR(10) NOT NULL DEFAULT 'DRAFT',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Barème fiscal libyen de référence (loi n°7/2010) — une seule ligne.
    await queryRunner.query(`
      INSERT INTO payroll_tax_configs (
        income_tax_bracket1_rate, income_tax_bracket1_ceiling,
        income_tax_bracket2_rate, personal_exemption_threshold,
        jihad_tax_individual_rate, solidarity_fund_rate,
        payroll_stamp_duty_rate, cnss_employee_rate, cnss_employer_rate
      )
      SELECT 5, 1000, 10, 0, 3, 1, 0.5, 5.125, 14.35
      WHERE NOT EXISTS (SELECT 1 FROM payroll_tax_configs)
    `);

    // Types de congés de référence.
    const leaveTypes: Array<[string, string, number]> = [
      ['إجازة سنوية مدفوعة', 'Paid annual leave', 21],
      ['إجازة مرضية', 'Sick leave', 14],
      ['إجازة غير مدفوعة', 'Unpaid leave', 0],
      ['إجازة أخرى', 'Other leave', 0],
    ];
    for (const [nameAr, nameEn, days] of leaveTypes) {
      await queryRunner.query(
        `INSERT INTO leave_types (name_ar, name_en, default_days_per_year)
         SELECT $1::varchar, $2::varchar, $3::decimal
         WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE name_en = $2::varchar)`,
        [nameAr, nameEn, days],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS performance_reviews`);
    await queryRunner.query(`DROP TABLE IF EXISTS employment_contracts`);
    await queryRunner.query(`DROP TABLE IF EXISTS payslips`);
    await queryRunner.query(`DROP TABLE IF EXISTS payroll_tax_configs`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_balances`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_types`);
  }
}
