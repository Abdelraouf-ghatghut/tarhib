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
    key: 'cleaning.task.view',
    nameAr: 'عرض مهام التنظيف',
    nameEn: 'View cleaning tasks',
    scope: PermissionScope.TARHIB,
  },
  // Client company
  {
    key: 'order.create',
    nameAr: 'إنشاء طلب',
    nameEn: 'Create orders',
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
    nameEn: 'Directeur Général',
    slaPriority: SlaPriority.P1,
    permissions: PERMISSIONS.filter(
      (p) =>
        p.scope === PermissionScope.TARHIB || p.scope === PermissionScope.ALL,
    ).map((p) => p.key),
  },
  {
    nameAr: 'نائب المدير',
    nameEn: 'Vice-Directeur',
    slaPriority: SlaPriority.P1,
    permissions: [
      'company.manage',
      'branch.manage',
      'employee.manage',
      'role.manage',
      'report.view',
      'profile.edit',
    ],
  },
  {
    nameAr: 'مدير الفرع',
    nameEn: 'Directeur de branche',
    slaPriority: SlaPriority.P2,
    permissions: [
      'employee.manage',
      'report.view',
      'vip.manage',
      'inventory.manage',
      'order.queue.manage',
      'profile.edit',
    ],
  },
  {
    nameAr: 'مشرف',
    nameEn: 'Superviseur',
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
    nameEn: 'Cuisinier',
    slaPriority: SlaPriority.P3,
    permissions: ['order.prepare', 'order.queue.manage', 'profile.edit'],
  },
  {
    nameAr: 'عامل توصيل',
    nameEn: 'Livreur',
    slaPriority: SlaPriority.P3,
    permissions: ['order.deliver', 'order.queue.manage', 'profile.edit'],
  },
  {
    nameAr: 'عاملة نظافة',
    nameEn: 'Femme de ménage',
    slaPriority: SlaPriority.P4,
    permissions: ['cleaning.task.view', 'profile.edit'],
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
      if (existing) continue;

      const permissions = await this.permissionRepo.find({
        where: r.permissions.map((key) => ({ key })),
      });

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
