import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Permission,
  PermissionScope,
} from '../roles/entities/permission.entity.js';
import { Role, RoleScope, SlaPriority } from '../roles/entities/role.entity.js';

const PERMISSIONS: Array<{
  key: string;
  nameAr: string;
  nameEn: string;
  scope: PermissionScope;
}> = [
  // Tarhib internal
  {
    key: 'company.manage',
    nameAr: 'إدارة الشركات',
    nameEn: 'Manage companies',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'branch.manage',
    nameAr: 'إدارة الفروع',
    nameEn: 'Manage branches',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'employee.manage',
    nameAr: 'إدارة الموظفين',
    nameEn: 'Manage employees',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'employee.salary.manage',
    nameAr: 'إدارة رواتب الموظفين',
    nameEn: 'Manage employee salaries',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'role.manage',
    nameAr: 'إدارة الأدوار',
    nameEn: 'Manage roles',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'report.view',
    nameAr: 'عرض التقارير',
    nameEn: 'View reports',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'procurement.cost.view',
    nameAr: 'عرض تكاليف المشتريات',
    nameEn: 'View procurement costs',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'finance.view',
    nameAr: 'عرض المالية',
    nameEn: 'View finance',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'finance.manage',
    nameAr: 'إدارة المالية',
    nameEn: 'Manage finance',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'accounting.view',
    nameAr: 'عرض المحاسبة العامة',
    nameEn: 'View general ledger',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'accounting.manage',
    nameAr: 'إدارة المحاسبة العامة',
    nameEn: 'Manage general ledger',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'hr.leave.manage',
    nameAr: 'إدارة الإجازات',
    nameEn: 'Manage leave requests',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'hr.leave.approve',
    nameAr: 'الموافقة على الإجازات',
    nameEn: 'Approve leave requests',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'hr.contract.manage',
    nameAr: 'إدارة عقود العمل',
    nameEn: 'Manage employment contracts',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'hr.review.manage',
    nameAr: 'إدارة تقييمات الأداء',
    nameEn: 'Manage performance reviews',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'employee.impersonate',
    nameAr: 'تسجيل الدخول كموظف',
    nameEn: 'Log in as employee',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'role.impersonate',
    nameAr: 'تجربة دور آخر',
    nameEn: 'Test as another role',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'operations.dashboard.view',
    nameAr: 'عرض لوحة العمليات',
    nameEn: 'View operations dashboard',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'operations.branch.supervise',
    nameAr: 'الإشراف على الفرع',
    nameEn: 'Supervise branch operations',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'operations.global.supervise',
    nameAr: 'الإشراف العام على العمليات',
    nameEn: 'Supervise global operations',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'order.queue.view',
    nameAr: 'عرض قائمة الطلبات',
    nameEn: 'View order queue',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'order.queue.manage',
    nameAr: 'إدارة قائمة الطلبات',
    nameEn: 'Manage order queue',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'order.prepare',
    nameAr: 'تحضير الطلبات',
    nameEn: 'Prepare orders',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'order.deliver',
    nameAr: 'توصيل الطلبات',
    nameEn: 'Deliver orders',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'order.stockout.report',
    nameAr: 'الإبلاغ عن نفاد المخزون',
    nameEn: 'Report stockout',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'stock.kitchen.view',
    nameAr: 'عرض مخزون المطبخ',
    nameEn: 'View kitchen stock',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'stock.kitchen.request',
    nameAr: 'طلب تزويد المطبخ',
    nameEn: 'Request kitchen replenishment',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'stock.view',
    nameAr: 'عرض المخزون',
    nameEn: 'View stock',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'stock.manage',
    nameAr: 'إدارة المخزون',
    nameEn: 'Manage stock',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'stock.transfer',
    nameAr: 'تحويل المخزون',
    nameEn: 'Transfer stock',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'inventory.manage',
    nameAr: 'إدارة المخزون',
    nameEn: 'Manage inventory',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'vip.manage',
    nameAr: 'إدارة مخزون VIP',
    nameEn: 'Manage VIP stock',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'vip.view',
    nameAr: 'عرض VIP',
    nameEn: 'View VIP',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'cleaning.task.view',
    nameAr: 'عرض مهام التنظيف',
    nameEn: 'View cleaning tasks',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'cleaning.task.manage',
    nameAr: 'إدارة مهام التنظيف',
    nameEn: 'Manage cleaning tasks',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'cleaning.task.assign',
    nameAr: 'إسناد مهام التنظيف',
    nameEn: 'Assign cleaning tasks',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'cleaning.task.complete',
    nameAr: 'إنجاز مهامي في التنظيف',
    nameEn: 'Complete own cleaning tasks',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'cleaning.product.view',
    nameAr: 'عرض منتجات النظافة',
    nameEn: 'View cleaning products',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'cleaning.product.manage',
    nameAr: 'إدارة منتجات النظافة',
    nameEn: 'Manage cleaning products',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'cleaning.product.request',
    nameAr: 'طلب إعادة تزويد منتجات النظافة',
    nameEn: 'Request cleaning product replenishment',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'procurement.view',
    nameAr: 'عرض المشتريات',
    nameEn: 'View procurement',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'procurement.manage',
    nameAr: 'إدارة المشتريات',
    nameEn: 'Manage procurement',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'procurement.validate',
    nameAr: 'تدقيق المشتريات',
    nameEn: 'Validate procurement',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'procurement.reject',
    nameAr: 'رفض المشتريات',
    nameEn: 'Reject procurement',
    scope: PermissionScope.TARHIB,
  },
  {
    key: 'alert.view',
    nameAr: 'عرض التنبيهات',
    nameEn: 'View alerts',
    scope: PermissionScope.TARHIB,
  },
  // Operations 2.0 — granular permissions. Legacy aggregate permissions
  // remain seeded during the role migration window.
  ...[
    ['inventory.view', 'View inventory'],
    ['inventory.create', 'Create inventory items'],
    ['inventory.update', 'Update inventory items'],
    ['inventory.adjust', 'Adjust inventory quantities'],
    ['inventory.transfer.view', 'View inventory transfers'],
    ['inventory.transfer.create', 'Create inventory transfers'],
    ['inventory.transfer.confirm', 'Confirm inventory transfers'],
    ['inventory.transfer.cancel', 'Cancel inventory transfers'],
    ['vip.location.view', 'View VIP locations'],
    ['vip.location.manage', 'Manage VIP locations'],
    ['vip.task.view', 'View VIP replenishment tasks'],
    ['vip.task.complete', 'Complete VIP replenishment tasks'],
    ['procurement.create', 'Create purchase orders'],
    ['procurement.edit_draft', 'Edit draft purchase orders'],
    ['procurement.submit', 'Submit purchase orders'],
    ['procurement.send', 'Send purchase orders'],
    ['procurement.cancel', 'Cancel purchase orders'],
    ['procurement.receive', 'Receive purchase orders'],
    ['meeting.preparation.view', 'View meeting preparations'],
    ['meeting.preparation.execute', 'Execute meeting preparations'],
    ['meeting.preparation.manage', 'Manage meeting preparations'],
  ].map(([key, nameEn]) => ({
    key,
    nameAr: nameEn,
    nameEn,
    scope: PermissionScope.TARHIB,
  })),
  // Client company
  {
    key: 'order.create',
    nameAr: 'إنشاء طلب',
    nameEn: 'Create orders',
    scope: PermissionScope.CLIENT,
  },
  {
    key: 'order.view_own',
    nameAr: 'عرض طلباتي',
    nameEn: 'View own orders',
    scope: PermissionScope.CLIENT,
  },
  {
    key: 'order.reorder',
    nameAr: 'إعادة الطلب',
    nameEn: 'Reorder',
    scope: PermissionScope.CLIENT,
  },
  {
    key: 'order.approve',
    nameAr: 'الموافقة على الطلبات',
    nameEn: 'Approve orders',
    scope: PermissionScope.CLIENT,
  },
  {
    key: 'catalog.view',
    nameAr: 'عرض الكتالوج',
    nameEn: 'View catalog',
    scope: PermissionScope.CLIENT,
  },
  {
    key: 'favorite.manage',
    nameAr: 'إدارة المفضلة',
    nameEn: 'Manage favorites',
    scope: PermissionScope.CLIENT,
  },
  {
    key: 'meeting.book',
    nameAr: 'حجز قاعة اجتماعات',
    nameEn: 'Book meeting room',
    scope: PermissionScope.CLIENT,
  },
  {
    key: 'meeting.order_services',
    nameAr: 'طلب خدمات الاجتماع',
    nameEn: 'Order meeting services',
    scope: PermissionScope.CLIENT,
  },
  {
    key: 'meeting.manage',
    nameAr: 'إدارة الاجتماعات',
    nameEn: 'Manage meetings',
    scope: PermissionScope.CLIENT,
  },
  {
    key: 'quota.view',
    nameAr: 'عرض الحصص',
    nameEn: 'View quotas',
    scope: PermissionScope.CLIENT,
  },
  {
    key: 'notification.view',
    nameAr: 'عرض الإشعارات',
    nameEn: 'View notifications',
    scope: PermissionScope.ALL,
  },
  {
    key: 'profile.manage',
    nameAr: 'إدارة الملف الشخصي',
    nameEn: 'Manage profile',
    scope: PermissionScope.ALL,
  },
  // Universal
  {
    key: 'profile.edit',
    nameAr: 'تعديل الملف الشخصي',
    nameEn: 'Edit profile',
    scope: PermissionScope.ALL,
  },
];

const TARHIB_ROLES: Array<{
  nameAr: string;
  nameEn: string;
  slaPriority: SlaPriority;
  permissions: string[];
}> = [
  {
    nameAr: 'المدير العام',
    nameEn: 'General Director',
    slaPriority: SlaPriority.P1,
    permissions: [
      'operations.global.supervise',
      'operations.dashboard.view',
      'report.view',
      'procurement.view',
      'procurement.validate',
      'procurement.cost.view',
      'finance.view',
      'finance.manage',
      'accounting.view',
      'accounting.manage',
      'hr.leave.manage',
      'hr.leave.approve',
      'hr.contract.manage',
      'hr.review.manage',
      'employee.impersonate',
      'role.impersonate',
      'alert.view',
      'profile.edit',
    ],
  },
  {
    nameAr: 'نائب المدير',
    nameEn: 'Deputy Director',
    slaPriority: SlaPriority.P1,
    permissions: [
      'company.manage',
      'branch.manage',
      'employee.manage',
      'role.manage',
      'report.view',
      'procurement.cost.view',
      'finance.view',
      'finance.manage',
      'accounting.view',
      'accounting.manage',
      'hr.leave.manage',
      'hr.leave.approve',
      'hr.contract.manage',
      'hr.review.manage',
      'cleaning.product.manage',
      'cleaning.task.manage',
      'cleaning.task.assign',
      'profile.edit',
    ],
  },
  {
    nameAr: 'مدير الفرع',
    nameEn: 'Branch Manager',
    slaPriority: SlaPriority.P2,
    permissions: [
      'employee.manage',
      'report.view',
      'vip.manage',
      'inventory.manage',
      'order.queue.manage',
      'cleaning.product.manage',
      'cleaning.task.manage',
      'cleaning.task.assign',
      'hr.leave.approve',
      'profile.edit',
    ],
  },
  {
    nameAr: 'مشرف',
    nameEn: 'Supervisor',
    slaPriority: SlaPriority.P2,
    permissions: [
      'order.queue.manage',
      'inventory.manage',
      'vip.manage',
      'order.prepare',
      'order.deliver',
      'profile.edit',
    ],
  },
  {
    nameAr: 'طاهٍ',
    nameEn: 'Cook',
    slaPriority: SlaPriority.P3,
    permissions: [
      'order.queue.view',
      'order.prepare',
      'order.stockout.report',
      'stock.kitchen.view',
      'stock.kitchen.request',
      'profile.edit',
    ],
  },
  {
    nameAr: 'عامل توصيل',
    nameEn: 'Delivery Agent',
    slaPriority: SlaPriority.P3,
    permissions: ['order.queue.view', 'order.deliver', 'profile.edit'],
  },
  {
    nameAr: 'مدير الضيافة والنظافة',
    nameEn: 'Hospitality and Cleaning Manager',
    slaPriority: SlaPriority.P2,
    permissions: [
      'operations.dashboard.view',
      'operations.branch.supervise',
      'order.queue.view',
      'cleaning.task.manage',
      'cleaning.task.assign',
      'cleaning.product.view',
      'meeting.preparation.view',
      'meeting.preparation.manage',
      'stock.view',
      'report.view',
      'profile.edit',
    ],
  },
  {
    nameAr: 'موظف الضيافة',
    nameEn: 'Hospitality Agent',
    slaPriority: SlaPriority.P3,
    permissions: [
      'meeting.preparation.view',
      'meeting.preparation.execute',
      'stock.kitchen.view',
      'stock.kitchen.request',
      'profile.edit',
    ],
  },
  {
    nameAr: 'مسؤول المخزون',
    nameEn: 'Stock Manager',
    slaPriority: SlaPriority.P2,
    permissions: [
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
      'vip.view',
      'vip.manage',
      'procurement.view',
      'procurement.receive',
      'profile.edit',
    ],
  },
  {
    nameAr: 'مسؤول المشتريات',
    nameEn: 'Purchasing Manager',
    slaPriority: SlaPriority.P2,
    permissions: [
      'procurement.view',
      'procurement.create',
      'procurement.edit_draft',
      'procurement.submit',
      'procurement.send',
      'procurement.cancel',
      'procurement.cost.view',
      'stock.view',
      'profile.edit',
    ],
  },
  {
    nameAr: 'موظف التموين VIP',
    nameEn: 'VIP Replenishment Agent',
    slaPriority: SlaPriority.P3,
    permissions: [
      'vip.location.view',
      'vip.task.view',
      'vip.task.complete',
      'profile.edit',
    ],
  },
  {
    nameAr: 'عاملة نظافة',
    nameEn: 'Cleaner',
    slaPriority: SlaPriority.P4,
    permissions: [
      'cleaning.task.view',
      'cleaning.task.complete',
      'cleaning.product.view',
      'cleaning.product.request',
      'profile.edit',
    ],
  },
];

@Injectable()
export class PermissionsSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionsSeeder.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedPermissions();
    await this.seedTarhibRoles();
  }

  private async seedPermissions(): Promise<void> {
    for (const p of PERMISSIONS) {
      const existing = await this.permissionRepo.findOne({
        where: { key: p.key },
      });
      if (!existing) {
        await this.permissionRepo.save(this.permissionRepo.create(p));
        this.logger.log(`Seeded permission: ${p.key}`);
      }
    }
  }

  private async seedTarhibRoles(): Promise<void> {
    for (const r of TARHIB_ROLES) {
      const existing = await this.roleRepo.findOne({
        where: {
          nameEn: r.nameEn,
          scope: RoleScope.TARHIB,
          companyId: null as unknown as string,
        },
      });
      const permissions = await this.permissionRepo.find({
        where: r.permissions.map((key) => ({ key })),
      });

      if (existing) {
        existing.slaPriority = r.slaPriority;
        existing.permissions = permissions;
        await this.roleRepo.save(existing);
        continue;
      }

      const role = this.roleRepo.create({
        nameAr: r.nameAr,
        nameEn: r.nameEn,
        scope: RoleScope.TARHIB,
        slaPriority: r.slaPriority,
        isSystem: true,
        companyId: null,
        permissions,
      });
      await this.roleRepo.save(role);
      this.logger.log(`Seeded Tarhib role: ${r.nameEn}`);
    }
  }
}
