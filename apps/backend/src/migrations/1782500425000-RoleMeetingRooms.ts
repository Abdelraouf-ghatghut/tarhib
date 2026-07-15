import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Accès aux salles de réunion par rôle client : soit toutes les salles de la
 * société (all_rooms_allowed = true, défaut — comportement historique), soit
 * une sélection explicite via la table de jointure role_meeting_rooms.
 */
export class RoleMeetingRooms1782500425000 implements MigrationInterface {
  name = 'RoleMeetingRooms1782500425000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "all_rooms_allowed" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_meeting_rooms" (
        "role_id" uuid NOT NULL,
        "room_id" uuid NOT NULL,
        CONSTRAINT "PK_role_meeting_rooms" PRIMARY KEY ("role_id", "room_id"),
        CONSTRAINT "FK_role_meeting_rooms_role" FOREIGN KEY ("role_id")
          REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_meeting_rooms_room" FOREIGN KEY ("room_id")
          REFERENCES "meeting_rooms"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_role_meeting_rooms_role" ON "role_meeting_rooms" ("role_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "role_meeting_rooms"`);
    await queryRunner.query(
      `ALTER TABLE "roles" DROP COLUMN "all_rooms_allowed"`,
    );
  }
}
