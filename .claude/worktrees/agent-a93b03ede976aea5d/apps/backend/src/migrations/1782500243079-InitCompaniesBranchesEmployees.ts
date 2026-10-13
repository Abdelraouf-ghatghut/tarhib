import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCompaniesBranchesEmployees1782500243079 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name       VARCHAR(255) NOT NULL UNIQUE,
        slug       VARCHAR(255) NOT NULL UNIQUE,
        active     BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id),
        name_ar    VARCHAR(255) NOT NULL,
        name_en    VARCHAR(255) NOT NULL,
        active     BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_branches_company_id ON branches(company_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id),
        branch_id  UUID NOT NULL REFERENCES branches(id),
        name_ar    VARCHAR(255) NOT NULL,
        name_en    VARCHAR(255) NOT NULL,
        active     BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_departments_branch_id ON departments(branch_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        keycloak_id   VARCHAR(255) UNIQUE,
        company_id    UUID NOT NULL REFERENCES companies(id),
        branch_id     UUID NOT NULL REFERENCES branches(id),
        department_id UUID NOT NULL REFERENCES departments(id),
        first_name_ar VARCHAR(255) NOT NULL,
        first_name_en VARCHAR(255) NOT NULL,
        last_name_ar  VARCHAR(255) NOT NULL,
        last_name_en  VARCHAR(255) NOT NULL,
        email         VARCHAR(255) NOT NULL UNIQUE,
        phone_number  VARCHAR(20)  NOT NULL UNIQUE,
        role          VARCHAR(50)  NOT NULL,
        active        BOOLEAN NOT NULL DEFAULT true,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS employees`);
    await queryRunner.query(`DROP TABLE IF EXISTS departments`);
    await queryRunner.query(`DROP TABLE IF EXISTS branches`);
    await queryRunner.query(`DROP TABLE IF EXISTS companies`);
  }
}
