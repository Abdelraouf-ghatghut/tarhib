import { MigrationInterface, QueryRunner } from 'typeorm';

/** Corrects the Arabic identity of the existing platform administrator. */
export class FixAbdelraoufArabicName1786100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE employees
       SET first_name_ar = $1, last_name_ar = $2
       WHERE LOWER(email) = LOWER($3)`,
      ['عبدالروؤف', 'الغطغوط', 'ghatghut.abdelraouf@gmail.com'],
    );
  }

  // This migration corrects production identity data; rolling back application
  // code must not erase the corrected employee name.
  async down(): Promise<void> {}
}
