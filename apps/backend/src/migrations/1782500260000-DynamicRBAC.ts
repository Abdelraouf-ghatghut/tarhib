import { MigrationInterface, QueryRunner } from 'typeorm';

export class DynamicRBAC1782500260000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // permissions catalogue (seeded, read-only via UI)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        key      VARCHAR(100) PRIMARY KEY,
        name_ar  VARCHAR(200) NOT NULL,
        name_en  VARCHAR(200) NOT NULL,
        scope    VARCHAR(20)  NOT NULL CHECK (scope IN ('TARHIB','CLIENT','ALL'))
      )
    `);

    // roles (Tarhib system roles: company_id NULL; client roles: company_id = tenant)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
        name_ar     VARCHAR(100) NOT NULL,
        name_en     VARCHAR(100) NOT NULL,
        scope       VARCHAR(20)  NOT NULL CHECK (scope IN ('TARHIB','CLIENT')),
        sla_priority VARCHAR(2)  NOT NULL DEFAULT 'P5'
                       CHECK (sla_priority IN ('P1','P2','P3','P4','P5')),
        is_system   BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_roles_company ON roles(company_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_roles_scope ON roles(scope)`,
    );

    // role ↔ permission N:N
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id        UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_key VARCHAR(100) NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_key)
      )
    `);

    // quota limit config per client role (config table, not tracking)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_quotas (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('DAILY','WEEKLY','MONTHLY')),
        max_quantity INT NOT NULL CHECK (max_quantity > 0),
        UNIQUE (role_id, product_id, period_type)
      )
    `);

    // individual quota consumption tracking (replaces quotas.used_quantity approach)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employee_quota_usage (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id  UUID NOT NULL,
        product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        period_start DATE NOT NULL,
        period_end   DATE NOT NULL,
        used_quantity INT NOT NULL DEFAULT 0,
        UNIQUE (employee_id, product_id, company_id, period_start, period_end)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_emp_quota_usage_employee ON employee_quota_usage(employee_id)`,
    );

    // add role_id FK + scope to employees (nullable during transition)
    await queryRunner.query(
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'CLIENT' CHECK (scope IN ('TARHIB','CLIENT'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE employees DROP COLUMN IF EXISTS scope`,
    );
    await queryRunner.query(
      `ALTER TABLE employees DROP COLUMN IF EXISTS role_id`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS employee_quota_usage`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_quotas`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions`);
  }
}
