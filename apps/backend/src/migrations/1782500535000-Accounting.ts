import { MigrationInterface, QueryRunner } from 'typeorm';

/** Comptabilité générale Tarhib (plan comptable, écritures partie double,
 * exercices) — voir apps/backend/src/accounting/. Plan comptable seedé
 * couvrant l'existant (Finance) et la fiscalité libyenne (loi n°7/2010 :
 * impôt sur les bénéfices, taxe Jihad, CNSS, droits de timbre, douane, taxe
 * foncière) — pas de TVA (inexistante en Libye). */
export class Accounting1782500535000 implements MigrationInterface {
  name = 'Accounting1782500535000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(20) UNIQUE NOT NULL,
        label VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL,
        parent_id UUID REFERENCES chart_of_accounts(id),
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fiscal_years (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        year INT UNIQUE NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'OPEN',
        closed_at TIMESTAMPTZ,
        closed_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        date DATE NOT NULL,
        reference VARCHAR(50) UNIQUE NOT NULL,
        label VARCHAR(255) NOT NULL,
        source VARCHAR(20) NOT NULL,
        source_id UUID,
        status VARCHAR(10) NOT NULL DEFAULT 'POSTED',
        posted_by UUID,
        fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS journal_entry_lines (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
        account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
        debit DECIMAL(12,2) NOT NULL DEFAULT 0,
        credit DECIMAL(12,2) NOT NULL DEFAULT 0,
        label TEXT,
        company_id UUID
      )
    `);

    // Pont Finance → Comptabilité : une dépense payée immédiatement (Banque/
    // Caisse en crédit) ou encore due (Fournisseurs/Personnel en crédit).
    await queryRunner.query(`
      ALTER TABLE finance_expenses ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT true
    `);

    // Exercice en cours — année de la migration.
    await queryRunner.query(`
      INSERT INTO fiscal_years (year, start_date, end_date, status)
      VALUES (2026, '2026-01-01', '2026-12-31', 'OPEN')
      ON CONFLICT (year) DO NOTHING
    `);

    const accounts: Array<[string, string, string]> = [
      ['101000', 'Capital social', 'EQUITY'],
      ['120000', "Résultat de l'exercice", 'EQUITY'],
      ['401000', 'Fournisseurs', 'LIABILITY'],
      ['411000', 'Clients', 'ASSET'],
      ['421000', 'Personnel — rémunérations dues', 'LIABILITY'],
      ['431000', 'CNSS à payer (parts salarié + employeur)', 'LIABILITY'],
      ['444000', 'État — Impôt sur les bénéfices à payer', 'LIABILITY'],
      ['444100', 'État — Taxe Jihad (société) à payer', 'LIABILITY'],
      ['444200', 'État — Impôt sur salaires à payer (5%/10%)', 'LIABILITY'],
      ['444300', 'État — Taxe Jihad (salariés) à payer', 'LIABILITY'],
      ['444400', 'État — Fonds de solidarité à payer', 'LIABILITY'],
      [
        '447000',
        'État — Droit de timbre à payer (contrats/salaires/transactions)',
        'LIABILITY',
      ],
      ['448000', 'État — Droits de douane à payer', 'LIABILITY'],
      [
        '449000',
        'État — Taxe foncière à payer (inactif par défaut)',
        'LIABILITY',
      ],
      ['512000', 'Banque', 'ASSET'],
      ['530000', 'Caisse', 'ASSET'],
      ['606100', 'Loyers et charges locatives', 'EXPENSE'],
      ['606200', 'Énergie / eau', 'EXPENSE'],
      ['623000', 'Publicité, marketing', 'EXPENSE'],
      ['627000', "Droits de timbre et d'enregistrement", 'EXPENSE'],
      ['628000', 'Frais divers', 'EXPENSE'],
      [
        '632000',
        'Droits de douane sur importations (saisie manuelle)',
        'EXPENSE',
      ],
      ['641000', 'Charges de personnel — salaires bruts', 'EXPENSE'],
      ['645000', 'Charges sociales patronales (CNSS 14,35%)', 'EXPENSE'],
      ['651000', 'Taxe foncière (inactif par défaut)', 'EXPENSE'],
      ['681100', 'Dotations aux amortissements', 'EXPENSE'],
      ['695000', 'Impôts sur les bénéfices', 'EXPENSE'],
      ['706000', 'Prestations de services — contrats clients', 'REVENUE'],
      ['758000', 'Produits divers', 'REVENUE'],
    ];

    for (const [code, label, type] of accounts) {
      await queryRunner.query(
        `INSERT INTO chart_of_accounts (code, label, type) VALUES ($1, $2, $3)
         ON CONFLICT (code) DO NOTHING`,
        [code, label, type],
      );
    }

    // Comptes marqués inactifs par défaut (pas de bien immobilier connu).
    await queryRunner.query(
      `UPDATE chart_of_accounts SET active = false WHERE code IN ('449000', '651000')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE finance_expenses DROP COLUMN IF EXISTS paid`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS journal_entry_lines`);
    await queryRunner.query(`DROP TABLE IF EXISTS journal_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS fiscal_years`);
    await queryRunner.query(`DROP TABLE IF EXISTS chart_of_accounts`);
  }
}
