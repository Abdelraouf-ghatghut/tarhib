import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Employee,
  EmployeeScope,
} from '../employees/entities/employee.entity.js';
import { Role, RoleScope } from '../roles/entities/role.entity.js';
import { legacyPermissions } from '../auth/legacy-permissions.js';

export type DataScope = 'GLOBAL' | 'COMPANY' | 'BRANCH' | 'OWN';

export interface AccessRoleSummary {
  id: string;
  nameAr: string;
  nameEn: string | null;
  scope: RoleScope;
  primary: boolean;
}

export interface MobileModule {
  key: string;
  route: string;
  order: number;
  label: { en: string; ar: string };
}

export interface AccessProfile {
  employee: {
    id: string;
    keycloakId: string | null;
    email: string;
    firstNameAr: string;
    firstNameEn: string;
    lastNameAr: string;
    lastNameEn: string;
    phoneNumber: string;
    companyId: string | null;
    branchId: string | null;
    departmentId: string | null;
    scope: string;
    /** Renseignés seulement si les relations company/branch ont été chargées par l'appelant. */
    company: { nameAr: string; nameEn: string | null } | null;
    branch: { nameAr: string; nameEn: string | null } | null;
  };
  primaryRoleId: string | null;
  roles: AccessRoleSummary[];
  permissions: string[];
  capabilities: Record<string, boolean>;
  modules: MobileModule[];
  dataScope: DataScope;
}

const CAPABILITY_PERMISSIONS: Record<string, string[]> = {
  canViewCatalog: ['catalog.view'],
  canManageFavorites: ['favorite.manage'],
  canCreateOrder: ['order.create'],
  canViewOwnOrders: ['order.view_own', 'order.create'],
  canReorder: ['order.reorder', 'order.create'],
  canBookMeeting: ['meeting.book'],
  canOrderMeetingServices: ['meeting.order_services'],
  canViewMeetingPreparations: [
    'meeting.preparation.view',
    'meeting.preparation.execute',
    'meeting.preparation.manage',
  ],
  canViewNotifications: ['notification.view'],
  canManageProfile: ['profile.manage', 'profile.edit'],

  canViewOperationsDashboard: [
    'operations.dashboard.view',
    'operations.branch.supervise',
    'operations.global.supervise',
    'report.view',
  ],
  canSuperviseGlobal: ['operations.global.supervise', 'company.manage'],
  canSuperviseBranch: [
    'operations.branch.supervise',
    'branch.manage',
    'report.view',
  ],
  canViewOrderQueue: ['order.queue.view', 'order.queue.manage'],
  canPrepareOrders: ['order.prepare'],
  canDeliverOrders: ['order.deliver'],
  canReportStockout: ['order.stockout.report', 'order.prepare'],
  canViewKitchenStock: ['stock.kitchen.view', 'inventory.manage'],
  canRequestKitchenReplenishment: ['stock.kitchen.request', 'order.prepare'],
  canViewStock: ['stock.view', 'inventory.manage'],
  canManageStock: ['stock.manage', 'inventory.manage'],
  canTransferStock: ['stock.transfer', 'inventory.manage'],
  canViewVip: ['vip.view', 'vip.manage'],
  canManageVip: ['vip.manage'],
  canViewCleaningTasks: ['cleaning.task.view', 'cleaning.task.manage'],
  canManageCleaningTasks: ['cleaning.task.manage'],
  canAssignCleaningTasks: ['cleaning.task.assign', 'cleaning.task.manage'],
  canCompleteCleaningTasks: ['cleaning.task.complete', 'cleaning.task.manage'],
  canViewCleaningProducts: ['cleaning.product.view', 'cleaning.product.manage'],
  canManageCleaningProducts: ['cleaning.product.manage'],
  canViewProcurement: ['procurement.view', 'procurement.manage'],
  canManageProcurement: ['procurement.manage'],
  canValidateProcurement: ['procurement.validate', 'procurement.manage'],
  canRejectProcurement: ['procurement.reject', 'procurement.manage'],
  canViewAlerts: ['alert.view', 'inventory.manage', 'report.view'],
};

const CLIENT_BASE_PERMISSIONS = [
  'catalog.view',
  'favorite.manage',
  'order.create',
  'order.view_own',
  'order.reorder',
  'quota.view',
  'notification.view',
  'profile.manage',
  'profile.edit',
];

const CLIENT_MODULES: Array<MobileModule & { capability: string }> = [
  {
    key: 'client.catalog',
    route: '/employee',
    order: 10,
    label: { en: 'Home', ar: 'الرئيسية' },
    capability: 'canViewCatalog',
  },
  {
    key: 'client.favorites',
    route: '/employee/favorites',
    order: 20,
    label: { en: 'Favorites', ar: 'المفضلة' },
    capability: 'canManageFavorites',
  },
  {
    key: 'client.cart',
    route: '/employee/cart',
    order: 30,
    label: { en: 'Cart', ar: 'السلة' },
    capability: 'canCreateOrder',
  },
  {
    key: 'client.meeting_rooms',
    route: '/employee/rooms',
    order: 40,
    label: { en: 'Rooms', ar: 'القاعات' },
    capability: 'canBookMeeting',
  },
  {
    key: 'client.notifications',
    route: '/notifications',
    order: 50,
    label: { en: 'Notifications', ar: 'الإشعارات' },
    capability: 'canViewNotifications',
  },
];

const OPERATIONS_MODULES: Array<MobileModule & { capability: string }> = [
  {
    key: 'operations.dashboard',
    route: '/manager/dashboard',
    order: 10,
    label: { en: 'Dashboard', ar: 'لوحة التحكم' },
    capability: 'canViewOperationsDashboard',
  },
  {
    key: 'operations.kitchen',
    route: '/agent/queue',
    order: 20,
    label: { en: 'Kitchen', ar: 'المطبخ' },
    capability: 'canPrepareOrders',
  },
  {
    key: 'operations.delivery',
    route: '/agent/queue',
    order: 30,
    label: { en: 'Delivery', ar: 'التوصيل' },
    capability: 'canDeliverOrders',
  },
  {
    key: 'operations.stock',
    route: '/operations/stock',
    order: 40,
    label: { en: 'Stock', ar: 'المخزون' },
    capability: 'canViewStock',
  },
  {
    key: 'operations.kitchen_stock',
    route: '/operations/kitchen-stock',
    order: 50,
    label: { en: 'Kitchen stock', ar: 'مخزون المطبخ' },
    capability: 'canViewKitchenStock',
  },
  {
    key: 'operations.vip',
    route: '/agent/vip-stock',
    order: 60,
    label: { en: 'VIP', ar: 'VIP' },
    capability: 'canViewVip',
  },
  {
    key: 'operations.meetings',
    route: '/operations/meetings',
    order: 65,
    label: { en: 'Meetings', ar: 'الاجتماعات' },
    capability: 'canViewMeetingPreparations',
  },
  {
    key: 'operations.cleaning',
    route: '/operations/cleaning',
    order: 70,
    label: { en: 'Cleaning', ar: 'النظافة' },
    capability: 'canViewCleaningTasks',
  },
  {
    key: 'operations.cleaning_products',
    route: '/operations/cleaning-products',
    order: 71,
    label: { en: 'Cleaning supplies', ar: 'مستلزمات النظافة' },
    capability: 'canViewCleaningProducts',
  },
  {
    key: 'operations.procurement',
    route: '/operations/procurement',
    order: 80,
    label: { en: 'Purchasing', ar: 'المشتريات' },
    capability: 'canViewProcurement',
  },
  {
    key: 'operations.alerts',
    route: '/operations/alerts',
    order: 90,
    label: { en: 'Alerts', ar: 'التنبيهات' },
    capability: 'canViewAlerts',
  },
];

@Injectable()
export class AccessPolicyService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async resolve(employee: Employee): Promise<AccessProfile> {
    const roles = await this.resolveRoles(employee);
    const permissions = this.resolvePermissions(employee, roles);
    const capabilities = this.resolveCapabilities(permissions);
    const modules = this.resolveModules(employee, capabilities);
    return {
      employee: {
        id: employee.id,
        keycloakId: employee.keycloakId,
        email: employee.email,
        firstNameAr: employee.firstNameAr,
        firstNameEn: employee.firstNameEn,
        lastNameAr: employee.lastNameAr,
        lastNameEn: employee.lastNameEn,
        phoneNumber: employee.phoneNumber,
        companyId: employee.companyId,
        branchId: employee.branchId,
        departmentId: employee.departmentId,
        scope: employee.scope,
        company: employee.company
          ? { nameAr: employee.company.nameAr, nameEn: employee.company.nameEn }
          : null,
        branch: employee.branch
          ? { nameAr: employee.branch.nameAr, nameEn: employee.branch.nameEn }
          : null,
      },
      primaryRoleId: employee.roleId,
      roles: roles.map((role) => ({
        id: role.id,
        nameAr: role.nameAr,
        nameEn: role.nameEn,
        scope: role.scope,
        primary: role.id === employee.roleId,
      })),
      permissions,
      capabilities,
      modules,
      dataScope: this.resolveDataScope(employee, permissions),
    };
  }

  /**
   * Impersonation (mode "tester ce rôle") : recalcule un profil d'accès
   * complet comme si `actorEmployee` détenait uniquement `targetRoleId` —
   * réutilise resolve() tel quel, sans toucher aux méthodes privées.
   * `sub`/`employeeId` de l'acteur réel restent inchangés côté appelant :
   * seule la couche permissions est simulée ici.
   */
  async resolveAsRole(
    actorEmployee: Employee,
    targetRoleId: string,
  ): Promise<AccessProfile> {
    const role = await this.roleRepo.findOne({ where: { id: targetRoleId } });
    if (!role) throw new NotFoundException('roleNotFound');
    const simulated: Employee = {
      ...actorEmployee,
      roleId: role.id,
      additionalRoles: [],
      scope:
        role.scope === RoleScope.CLIENT
          ? EmployeeScope.CLIENT
          : EmployeeScope.TARHIB,
      companyId: role.companyId ?? actorEmployee.companyId,
    };
    return this.resolve(simulated);
  }

  private async resolveRoles(employee: Employee): Promise<Role[]> {
    const roleIds = new Set<string>();
    if (employee.roleId) roleIds.add(employee.roleId);
    for (const role of employee.additionalRoles ?? []) roleIds.add(role.id);
    if (roleIds.size === 0) return [];

    return this.roleRepo.find({
      where: [...roleIds].map((id) => ({ id })),
      relations: ['permissions'],
    });
  }

  private resolvePermissions(employee: Employee, roles: Role[]): string[] {
    const keys = new Set<string>();
    if (employee.scope === EmployeeScope.CLIENT) {
      for (const key of CLIENT_BASE_PERMISSIONS) keys.add(key);
    }
    if (roles.length === 0) {
      for (const key of legacyPermissions(employee.role)) keys.add(key);
    }
    for (const role of roles) {
      for (const permission of role.permissions ?? []) keys.add(permission.key);
    }
    return [...keys].sort();
  }

  private resolveCapabilities(permissions: string[]): Record<string, boolean> {
    const permissionSet = new Set(permissions);
    const capabilities: Record<string, boolean> = {};
    for (const [capability, required] of Object.entries(
      CAPABILITY_PERMISSIONS,
    )) {
      capabilities[capability] = required.some((key) => permissionSet.has(key));
    }
    return capabilities;
  }

  private resolveModules(
    employee: Employee,
    capabilities: Record<string, boolean>,
  ): MobileModule[] {
    const modules =
      employee.scope === EmployeeScope.TARHIB
        ? OPERATIONS_MODULES
        : CLIENT_MODULES;
    return modules
      .filter((module) => capabilities[module.capability])
      .map(({ capability, ...module }) => {
        void capability;
        return module;
      });
  }

  private resolveDataScope(
    employee: Employee,
    permissions: string[],
  ): DataScope {
    const permissionSet = new Set(permissions);
    if (
      permissionSet.has('company.manage') ||
      permissionSet.has('operations.global.supervise')
    ) {
      return 'GLOBAL';
    }
    if (permissionSet.has('operations.company.supervise')) return 'COMPANY';
    if (
      employee.scope === EmployeeScope.TARHIB ||
      permissionSet.has('branch.manage') ||
      permissionSet.has('operations.branch.supervise')
    ) {
      return 'BRANCH';
    }
    return 'OWN';
  }
}
