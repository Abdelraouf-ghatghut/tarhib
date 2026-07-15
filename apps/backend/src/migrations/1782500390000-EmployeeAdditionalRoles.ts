import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmployeeAdditionalRoles1782500390000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS employee_roles (
        employee_id uuid NOT NULL,
        role_id uuid NOT NULL,
        CONSTRAINT pk_employee_roles PRIMARY KEY (employee_id, role_id),
        CONSTRAINT fk_employee_roles_employee
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        CONSTRAINT fk_employee_roles_role
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      )
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_employee_roles_role_id ON employee_roles(role_id)`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_employee_roles_role_id`);
    await qr.query(`DROP TABLE IF EXISTS employee_roles`);
  }
}
