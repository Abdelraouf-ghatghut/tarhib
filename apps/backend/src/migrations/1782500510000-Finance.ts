import { MigrationInterface, QueryRunner } from 'typeorm';

export class Finance1782500510000 implements MigrationInterface {
  name = 'Finance1782500510000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Contrats clients — revenu de Tarhib. Pas de colonne statut EXPIRED :
    // dérivé de end_date à la lecture (voir FinanceService).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS finance_contracts (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id        UUID NOT NULL REFERENCES companies(id),
        label             VARCHAR(255) NOT NULL,
        start_date        DATE NOT NULL,
        end_date          DATE NOT NULL,
        amount            DECIMAL(10, 2) NOT NULL,
        billing_frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY'
                            CHECK (billing_frequency IN ('MONTHLY','QUARTERLY','YEARLY','ONE_TIME')),
        status            VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT','ACTIVE','CANCELLED')),
        notes             TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_finance_contracts_company
        ON finance_contracts(company_id)
    `);

    // Frais divers — company_id nullable (frais général Tarhib vs imputable
    // à un client).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS finance_expenses (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category      VARCHAR(20) NOT NULL DEFAULT 'OTHER'
                        CHECK (category IN ('RENT','SALARIES','UTILITIES','MARKETING','OTHER')),
        label         VARCHAR(255) NOT NULL,
        amount        DECIMAL(10, 2) NOT NULL,
        expense_date  DATE NOT NULL,
        company_id    UUID REFERENCES companies(id),
        notes         TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_finance_expenses_date
        ON finance_expenses(expense_date)
    `);

    // Dettes — pas de colonne statut, dérivé de remaining_amount/due_date.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS finance_debts (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        creditor_name     VARCHAR(255) NOT NULL,
        total_amount      DECIMAL(10, 2) NOT NULL,
        remaining_amount  DECIMAL(10, 2) NOT NULL,
        due_date          DATE,
        notes             TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Comptes bancaires/caisse — solde constaté, pas de ledger de mouvements
    // en v1 (voir plan Finance : extension future si besoin d'historique).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS finance_accounts (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(255) NOT NULL,
        type        VARCHAR(20) NOT NULL DEFAULT 'BANK'
                      CHECK (type IN ('BANK','CASH')),
        balance     DECIMAL(10, 2) NOT NULL DEFAULT 0,
        notes       TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS finance_accounts`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_debts`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_expenses`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_contracts`);
  }
}
