import { MigrationInterface, QueryRunner } from 'typeorm';

export class VipLocationAssignment1782500325000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE inventory_items
        ADD COLUMN department_id UUID NULL REFERENCES departments(id) ON DELETE SET NULL,
        ADD COLUMN assigned_employee_id UUID NULL REFERENCES employees(id) ON DELETE SET NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE inventory_items
        DROP COLUMN IF EXISTS department_id,
        DROP COLUMN IF EXISTS assigned_employee_id
    `);
  }
}
