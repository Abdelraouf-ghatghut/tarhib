import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PR-2.2 — active pg_stat_statements : agrège durée/appels/lignes par
 * requête normalisée (paramètres remplacés par des placeholders), la base
 * de tout diagnostic de requête lente en prod. CREATE EXTENSION seul ne
 * suffit pas : le serveur doit aussi démarrer avec
 * shared_preload_libraries=pg_stat_statements (docker-compose.yml côté dev ;
 * postgresql.conf ou l'équivalent managé côté prod), sinon la vue reste
 * vide jusqu'au prochain redémarrage du serveur avec ce flag — cette
 * migration seule ne redémarre rien.
 */
export class PgStatStatements1782500800000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP EXTENSION IF EXISTS pg_stat_statements`);
  }
}
