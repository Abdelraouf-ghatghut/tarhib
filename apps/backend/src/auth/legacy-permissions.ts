/**
 * Mapping rôle legacy (string) → permissions.
 * Utilisé comme fallback tant que l'employé n'a pas de roleId (RBAC dynamique).
 * Partagé entre AuthService.enrichTokens (corps login) et
 * JwtStrategy.validate (req.user pour les guards).
 */
export function legacyPermissions(role?: string | null): string[] {
  switch ((role ?? '').toUpperCase()) {
    case 'EMPLOYEE':
      return [
        'catalog.view',
        'order.create',
        'meeting.book',
        'meeting.order_services',
        'quota.view',
        'profile.edit',
      ];
    case 'DEPARTMENT_MANAGER':
      return [
        'catalog.view',
        'order.create',
        'order.approve',
        'meeting.book',
        'meeting.order_services',
        'meeting.manage',
        'quota.view',
        'employee.manage',
        'report.view',
        'profile.edit',
      ];
    case 'HOSPITALITY_AGENT':
      return [
        'order.prepare',
        'order.deliver',
        'order.queue.manage',
        'vip.manage',
        'inventory.manage',
        'profile.edit',
      ];
    case 'INVENTORY_MANAGER':
      return ['inventory.manage', 'vip.manage', 'report.view', 'profile.edit'];
    case 'ADMIN':
      return [
        'company.manage',
        'branch.manage',
        'employee.manage',
        'role.manage',
        'report.view',
        'order.queue.manage',
        'inventory.manage',
        'vip.manage',
        'profile.edit',
      ];
    default:
      return ['profile.edit'];
  }
}
