import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration MANQUANTE — table `meeting_service_packages`.
 *
 * L'entité MeetingServicePackage (@Entity('meeting_service_packages')) existait
 * et était utilisée, mais AUCUNE migration ne créait sa table : elle n'apparaît
 * que dans NullableNameEn1782500500000 (ALTER). Les environnements existants
 * l'ont obtenue par `synchronize` (dérive de schéma) ; une base construite
 * uniquement par migrations n'avait pas cette table → 500000 échouait.
 *
 * `IF NOT EXISTS` : sûr pour les environnements dérivés (no-op s'ils l'ont déjà).
 * Colonnes alignées sur l'entité (stratégie de nommage TypeORM par défaut :
 * `descriptionAr/En` restent en camelCase, guillemets requis). name_en NULLABLE
 * dès la création → le DROP NOT NULL de 500000 est un no-op.
 */
export class CreateMeetingServicePackages1782500266000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS meeting_service_packages (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id     varchar NOT NULL,
        name_ar        varchar NOT NULL,
        name_en        varchar NULL,
        type           varchar(20) NOT NULL DEFAULT 'CUSTOM',
        "descriptionAr" jsonb NULL,
        "descriptionEn" jsonb NULL,
        is_active      boolean NOT NULL DEFAULT true,
        created_at     timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_meeting_service_packages_company ON meeting_service_packages(company_id)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS meeting_service_packages`);
  }
}
