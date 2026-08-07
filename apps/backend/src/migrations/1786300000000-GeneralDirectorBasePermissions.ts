import { MigrationInterface, QueryRunner } from 'typeorm';

const GENERAL_DIRECTOR_PERMISSIONS = [
  'report.view',
  'procurement.cost.view',
  'procurement.view',
  'procurement.validate',
  'procurement.manage',
  'procurement.reject',
  'procurement.create',
  'procurement.edit_draft',
  'procurement.submit',
  'procurement.send',
  'procurement.cancel',
  'procurement.receive',
  'finance.view',
  'finance.manage',
  'accounting.view',
  'accounting.manage',
  'hr.leave.manage',
  'hr.leave.approve',
  'hr.contract.manage',
  'hr.review.manage',
  'employee.impersonate',
  'operations.dashboard.view',
  'operations.global.supervise',
  'alert.view',
  'profile.edit',
  'company.manage',
  'branch.manage',
  'stock.kitchen.view',
  'stock.kitchen.request',
  'stock.view',
  'stock.manage',
  'stock.transfer',
  'inventory.manage',
  'inventory.view',
  'inventory.create',
  'inventory.update',
  'inventory.adjust',
  'inventory.transfer.view',
  'inventory.transfer.create',
  'inventory.transfer.confirm',
  'inventory.transfer.cancel',
  'vip.manage',
  'vip.view',
  'vip.location.view',
  'vip.location.manage',
  'vip.task.view',
  'vip.task.complete',
  'meeting.preparation.view',
  'meeting.preparation.execute',
  'meeting.preparation.manage',
  'meeting.book',
  'meeting.order_services',
  'meeting.manage',
  'quota.view',
] as const;

/** Sets the exact 54-permission baseline for the General Director role. */
export class GeneralDirectorBasePermissions1786300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const roles: unknown = await queryRunner.query(
      `SELECT id FROM roles
       WHERE scope = 'TARHIB' AND company_id IS NULL AND name_en = $1`,
      ['General Director'],
    );
    const firstRole: unknown = Array.isArray(roles) ? roles[0] : undefined;
    const roleId =
      firstRole &&
      typeof firstRole === 'object' &&
      'id' in firstRole &&
      typeof firstRole.id === 'string'
        ? firstRole.id
        : undefined;
    if (!roleId) return;

    await queryRunner.query(`DELETE FROM role_permissions WHERE role_id = $1`, [
      roleId,
    ]);
    for (const permission of GENERAL_DIRECTOR_PERMISSIONS) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_key)
         SELECT $1::uuid, $2::varchar
         WHERE EXISTS (
           SELECT 1 FROM permissions WHERE key = $2::varchar
         )
         ON CONFLICT DO NOTHING`,
        [roleId, permission],
      );
    }
  }

  async down(): Promise<void> {}
}
