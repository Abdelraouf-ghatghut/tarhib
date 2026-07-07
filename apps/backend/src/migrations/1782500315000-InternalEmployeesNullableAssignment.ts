import { MigrationInterface, QueryRunner } from 'typeorm';

export class InternalEmployeesNullableAssignment1782500315000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    // Tarhib n'est pas une entreprise du système : les employés internes sont
    // dispatchés sur un site client (société + branche) optionnel — le
    // superadmin, lui, n'est affecté nulle part.
    await qr.query(
      `ALTER TABLE employees ALTER COLUMN company_id DROP NOT NULL`,
    );
    await qr.query(
      `ALTER TABLE employees ALTER COLUMN branch_id DROP NOT NULL`,
    );
    await qr.query(
      `ALTER TABLE employees ALTER COLUMN department_id DROP NOT NULL`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE employees ALTER COLUMN department_id SET NOT NULL`,
    );
    await qr.query(`ALTER TABLE employees ALTER COLUMN branch_id SET NOT NULL`);
    await qr.query(
      `ALTER TABLE employees ALTER COLUMN company_id SET NOT NULL`,
    );
  }
}
