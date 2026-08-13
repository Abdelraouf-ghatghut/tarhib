import { MigrationInterface, QueryRunner } from 'typeorm';

export class OperationalZones1786560000000 implements MigrationInterface {
  name = 'OperationalZones1786560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE operational_zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL CHECK (type IN ('DELIVERY', 'CLEANING')),
        name_ar VARCHAR(120) NOT NULL,
        name_en VARCHAR(120),
        floors JSONB NOT NULL DEFAULT '[]'::jsonb,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (jsonb_typeof(floors) = 'array')
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_operational_zones_scope ON operational_zones(company_id, branch_id, type, active)',
    );
    await queryRunner.query(`
      CREATE TABLE employee_zone_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        zone_id UUID NOT NULL REFERENCES operational_zones(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
        starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ends_at TIMESTAMPTZ,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        assigned_by VARCHAR(120) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (ends_at IS NULL OR ends_at > starts_at)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_employee_zone_assignments_active ON employee_zone_assignments(employee_id, active, starts_at, ends_at)',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_employee_zone_assignment_active
      ON employee_zone_assignments(zone_id, employee_id)
      WHERE active = TRUE
    `);
    await queryRunner.query(`
      ALTER TABLE cleaning_tasks
        ADD COLUMN operational_zone_id UUID REFERENCES operational_zones(id) ON DELETE SET NULL,
        ADD COLUMN building VARCHAR(120),
        ADD COLUMN floor VARCHAR(50),
        ADD COLUMN location_name VARCHAR(160)
    `);
    await queryRunner.query(
      'CREATE INDEX idx_cleaning_tasks_zone_status ON cleaning_tasks(operational_zone_id, status)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cleaning_tasks
        DROP COLUMN IF EXISTS location_name,
        DROP COLUMN IF EXISTS floor,
        DROP COLUMN IF EXISTS building,
        DROP COLUMN IF EXISTS operational_zone_id
    `);
    await queryRunner.query('DROP TABLE IF EXISTS employee_zone_assignments');
    await queryRunner.query('DROP TABLE IF EXISTS operational_zones');
  }
}
