import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleaningTasks1782500415000 implements MigrationInterface {
  name = 'CleaningTasks1782500415000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cleaning_tasks (
        id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id                UUID NOT NULL REFERENCES companies(id),
        branch_id                 UUID NOT NULL REFERENCES branches(id),
        title                     VARCHAR(200) NOT NULL,
        description               TEXT,
        assigned_employee_id      UUID REFERENCES employees(id),
        status                    VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        due_date                  DATE,
        recurrence                VARCHAR(20) NOT NULL DEFAULT 'ONCE',
        completed_at              TIMESTAMPTZ,
        verified_by_employee_id   UUID REFERENCES employees(id),
        verified_at               TIMESTAMPTZ,
        notes                     TEXT,
        created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_branch ON cleaning_tasks(branch_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_assignee ON cleaning_tasks(assigned_employee_id)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cleaning_tasks`);
  }
}
