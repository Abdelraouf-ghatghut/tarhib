import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * name_en était NOT NULL avec repli applicatif sur name_ar quand l'anglais
 * n'était pas fourni — ce qui affichait le nom arabe dans le champ anglais
 * au lieu de le laisser vide, et empêchait de "vider" le champ en édition.
 * Rendu nullable pour que l'absence de nom anglais reste réellement vide.
 * companies.name (identifiant canonique interne, dérivé) reste NOT NULL.
 */
export class NullableNameEn1782500500000 implements MigrationInterface {
  name = 'NullableNameEn1782500500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'products',
      'branches',
      'departments',
      'suppliers',
      'meeting_rooms',
      'meeting_service_packages',
      'companies',
    ]) {
      await queryRunner.query(
        `ALTER TABLE ${table} ALTER COLUMN name_en DROP NOT NULL`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'products',
      'branches',
      'departments',
      'suppliers',
      'meeting_rooms',
      'meeting_service_packages',
      'companies',
    ]) {
      await queryRunner.query(
        `UPDATE ${table} SET name_en = name_ar WHERE name_en IS NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE ${table} ALTER COLUMN name_en SET NOT NULL`,
      );
    }
  }
}
