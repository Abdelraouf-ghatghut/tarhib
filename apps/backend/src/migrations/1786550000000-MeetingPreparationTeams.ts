import { MigrationInterface, QueryRunner } from 'typeorm';

export class MeetingPreparationTeams1786550000000 implements MigrationInterface {
  name = 'MeetingPreparationTeams1786550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE meeting_preparation_participants (
        preparation_id UUID NOT NULL REFERENCES meeting_preparations(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
        added_by_employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (preparation_id, employee_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_meeting_preparation_participants_employee
      ON meeting_preparation_participants(employee_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TABLE IF EXISTS meeting_preparation_participants',
    );
  }
}
