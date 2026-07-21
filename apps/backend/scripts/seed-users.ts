/**
 * Seed complet de données réalistes (npm run seed / npm run seed:reset).
 *
 * Tous les ids sont des UUID v4 générés par la base — aucun id codé en dur.
 * Tarhib n'est pas une entreprise du système : le personnel interne est
 * dispatché en mission sur les sites clients (le superadmin reste sans
 * affectation).
 *
 * Contenu : une société cliente bancaire (branches, départements), niveaux de
 * priorité, catalogue produits (commandables + VIP libre-service), stock par
 * branche (avec alertes), fournisseurs, salles de réunion, rôles clients avec
 * quotas, utilisateurs internes + externes (comptes Keycloak complets).
 *
 * --reset : purge TOUTES les données métier (TRUNCATE CASCADE) et les comptes
 * Keycloak associés, re-seede les permissions/rôles internes, puis recrée le
 * jeu de données. Sans --reset : upserts idempotents.
 *
 * Mot de passe commun : Tarhib@2026!
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { KeycloakService } from '../src/auth/keycloak/keycloak.service';
import { PermissionsSeeder } from '../src/permissions/permissions.seeder';
import { Company } from '../src/companies/entities/company.entity';
import { Branch } from '../src/branches/entities/branch.entity';
import { Department } from '../src/departments/entities/department.entity';
import {
  Employee,
  EmployeeScope,
  EmployeeStatus,
} from '../src/employees/entities/employee.entity';
import { Role, RoleScope } from '../src/roles/entities/role.entity';
import { Permission } from '../src/roles/entities/permission.entity';
import { CompanySlaLevel } from '../src/priority-sla/entities/company-sla-level.entity';
import { Product } from '../src/products/entities/product.entity';
import { ProductType } from '../src/products/dto/product.dto';
import {
  InventoryItem,
  StockZone,
} from '../src/inventory/entities/inventory-item.entity';
import { Supplier } from '../src/suppliers/entities/supplier.entity';
import { MeetingRoom } from '../src/meeting-rooms/entities/meeting-room.entity';
import {
  QuotaPeriodType,
  RoleQuota,
} from '../src/roles/entities/role-quota.entity';
import { OrdersService } from '../src/orders/orders.service';
import { Order } from '../src/orders/entities/order.entity';
import { OrderStatus } from '../src/orders/dto/order.dto';
import type { JwtPayload } from '../src/auth/interfaces/jwt-payload.interface';
import { ProcurementService } from '../src/procurement/procurement.service';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../src/procurement/entities/purchase-order.entity';
import { PurchaseOrderLine } from '../src/procurement/entities/purchase-order-line.entity';
import {
  CleaningTask,
  CleaningTaskRecurrence,
  CleaningTaskStatus,
} from '../src/cleaning-tasks/entities/cleaning-task.entity';
import { CleaningProduct } from '../src/cleaning-products/entities/cleaning-product.entity';
import { CleaningStockItem } from '../src/cleaning-stock/entities/cleaning-stock-item.entity';
import {
  CleaningStockRequest,
  CleaningStockRequestStatus,
} from '../src/cleaning-stock/entities/cleaning-stock-request.entity';
import {
  DeliveryTask,
  DeliveryTaskStatus,
} from '../src/delivery/entities/delivery-task.entity';
import {
  InventoryReplenishmentRequest,
  ReplenishmentStatus,
} from '../src/inventory-replenishments/entities/inventory-replenishment.entity';
import {
  InventoryTransfer,
  TransferStatus,
} from '../src/inventory-transfers/entities/inventory-transfer.entity';
import {
  MeetingPreparation,
  MeetingPreparationStatus,
} from '../src/meeting-preparations/entities/meeting-preparation.entity';
import {
  BookingStatus,
  RoomBooking,
} from '../src/meeting-rooms/entities/room-booking.entity';
import { Notification } from '../src/notifications/entities/notification.entity';

const logger = new Logger('Seed');
const DEFAULT_PASSWORD = 'Tarhib@2026!';

// ── Référentiel réaliste ─────────────────────────────────────────────────────

const COMPANIES = [
  {
    slug: 'masraf-al-waha',
    nameAr: 'مصرف الواحة',
    nameEn: 'Al Waha Bank',
    branches: [
      {
        nameAr: 'الإدارة العامة – طرابلس',
        nameEn: 'General Administration - Tripoli',
        departments: [
          {
            nameAr: 'إدارة الشؤون الإدارية والتجهيزات',
            nameEn: 'Administrative Affairs and Facilities',
          },
          { nameAr: 'إدارة الموارد البشرية', nameEn: 'Human Resources' },
          {
            nameAr: 'إدارة تقنية المعلومات',
            nameEn: 'Information Technology',
          },
          { nameAr: 'إدارة العمليات المصرفية', nameEn: 'Banking Operations' },
          { nameAr: 'إدارة المالية', nameEn: 'Finance' },
        ],
      },
      {
        nameAr: 'فرع حي الاندلس',
        nameEn: 'Hay Al-Andalus Branch',
        departments: [
          { nameAr: 'خدمة العملاء', nameEn: 'Customer Service' },
          { nameAr: 'الصرافة والخزينة', nameEn: 'Teller and Cash Desk' },
          { nameAr: 'العمليات المصرفية', nameEn: 'Banking Operations' },
        ],
      },
      {
        nameAr: 'فرع الزاوية',
        nameEn: 'Zawiya Branch',
        departments: [
          { nameAr: 'خدمة العملاء', nameEn: 'Customer Service' },
          { nameAr: 'القروض والتسهيلات', nameEn: 'Loans and Facilities' },
          { nameAr: 'العمليات المصرفية', nameEn: 'Banking Operations' },
        ],
      },
      {
        nameAr: 'فرع سوق الجمعة',
        nameEn: 'Souq Al-Jumaa Branch',
        departments: [
          { nameAr: 'خدمة العملاء', nameEn: 'Customer Service' },
          { nameAr: 'الحسابات الجارية', nameEn: 'Current Accounts' },
          { nameAr: 'الصرافة والخزينة', nameEn: 'Teller and Cash Desk' },
        ],
      },
      {
        nameAr: 'فرع ذات العماد',
        nameEn: 'Dat Al-Imad Branch',
        departments: [
          { nameAr: 'خدمة كبار العملاء', nameEn: 'Premium Banking' },
          { nameAr: 'الامتثال والمتابعة', nameEn: 'Compliance and Follow-up' },
          { nameAr: 'العمليات المصرفية', nameEn: 'Banking Operations' },
        ],
      },
      {
        nameAr: 'فرع زليتن',
        nameEn: 'Zliten Branch',
        departments: [
          { nameAr: 'خدمة العملاء', nameEn: 'Customer Service' },
          { nameAr: 'الحوالات', nameEn: 'Transfers' },
          { nameAr: 'الصرافة والخزينة', nameEn: 'Teller and Cash Desk' },
        ],
      },
    ],
  },
];

const PRIORITY_LEVELS = [
  { code: 'P1', nameAr: 'عاجل', nameEn: 'Urgent', targetMinutes: 10 },
  { code: 'P2', nameAr: 'مرتفع', nameEn: 'High', targetMinutes: 20 },
  { code: 'P3', nameAr: 'عادي', nameEn: 'Standard', targetMinutes: 30 },
  { code: 'P4', nameAr: 'منخفض', nameEn: 'Low', targetMinutes: 60 },
];

const PRODUCTS: Array<{
  nameAr: string;
  nameEn: string;
  category: string;
  type: ProductType;
  unitCost: number | null;
  // Stock par branche : [quantité, seuil min, seuil max]
  stock: [number, number, number];
  vipLocation?: string;
}> = [
  // Boissons — seul catalogue commandable de l'app Employee (écran d'accueil :
  // قهوة سادة/معدلة، نسكافيه، كابتشينو، ماء، شاي أخضر/أحمر)
  {
    nameAr: 'قهوة سادة',
    nameEn: 'Black Coffee',
    category: 'Drinks',
    type: ProductType.COMMANDABLE,
    unitCost: 80,
    stock: [45, 15, 80],
  },
  {
    nameAr: 'قهوة معدلة',
    nameEn: 'Coffee',
    category: 'Drinks',
    type: ProductType.COMMANDABLE,
    unitCost: 80,
    stock: [45, 15, 80],
  },
  {
    nameAr: 'نسكافيه',
    nameEn: 'Nescafé',
    category: 'Drinks',
    type: ProductType.COMMANDABLE,
    unitCost: 90,
    stock: [40, 15, 70],
  },
  {
    nameAr: 'كابتشينو',
    nameEn: 'Cappuccino',
    category: 'Drinks',
    type: ProductType.COMMANDABLE,
    unitCost: 120,
    stock: [30, 10, 50],
  },
  {
    nameAr: 'ماء',
    nameEn: 'Water',
    category: 'Drinks',
    type: ProductType.COMMANDABLE,
    unitCost: 30,
    stock: [120, 40, 200],
  },
  {
    nameAr: 'شاي أخضر',
    nameEn: 'Green Tea',
    category: 'Drinks',
    type: ProductType.COMMANDABLE,
    unitCost: 60,
    stock: [50, 15, 80],
  },
  {
    nameAr: 'شاي أحمر',
    nameEn: 'Black Tea',
    category: 'Drinks',
    type: ProductType.COMMANDABLE,
    unitCost: 60,
    stock: [50, 15, 80],
  },
  // VIP libre-service (jamais commandables — suivis par emplacement dédié)
  {
    nameAr: 'تمر فاخر',
    nameEn: 'Premium Dates',
    category: 'VIP Self-Service',
    type: ProductType.LIBRE_SERVICE_VIP,
    unitCost: 600,
    stock: [4, 6, 12],
    vipLocation: 'ثلاجة الإدارة العليا — Executive Fridge',
  },
  {
    nameAr: 'شوكولاتة بلجيكية',
    nameEn: 'Belgian Chocolates',
    category: 'VIP Self-Service',
    type: ProductType.LIBRE_SERVICE_VIP,
    unitCost: 900,
    stock: [8, 4, 15],
    vipLocation: 'ثلاجة الإدارة العليا — Executive Fridge',
  },
];

// Fournisseurs Tarhib — ressource globale, non liée à une société cliente.
const SUPPLIERS = [
  {
    nameAr: 'شركة الواحة للقهوة والضيافة',
    nameEn: 'Al Waha Coffee & Hospitality Supplies',
    contactName: 'Salem Al-Tarhouni',
    email: 'orders@waha-coffee.ly',
    phone: '+218912345601',
  },
  {
    nameAr: 'شركة طرابلس للمياه والعصائر',
    nameEn: 'Tripoli Water & Juices Co',
    contactName: 'Mariam Al-Misrati',
    email: 'sales@tripoli-water.ly',
    phone: '+218912345602',
  },
  {
    nameAr: 'مخبزة المدينة',
    nameEn: 'Al Madina Bakery',
    contactName: 'Omar Al-Zliteny',
    email: 'orders@madina-bakery.ly',
    phone: '+218912345603',
  },
];

const MEETING_ROOMS = [
  {
    companySlug: 'masraf-al-waha',
    branchEn: 'General Administration - Tripoli',
    nameAr: 'قاعة مجلس الإدارة',
    nameEn: 'Board Meeting Room',
    capacity: 16,
    amenities: { projector: true, videoConference: true, whiteboard: true },
  },
  {
    companySlug: 'masraf-al-waha',
    branchEn: 'General Administration - Tripoli',
    nameAr: 'قاعة التدريب',
    nameEn: 'Training Room',
    capacity: 24,
    amenities: { videoConference: true, screen: true },
  },
  {
    companySlug: 'masraf-al-waha',
    branchEn: 'Dat Al-Imad Branch',
    nameAr: 'قاعة كبار العملاء',
    nameEn: 'Premium Clients Room',
    capacity: 10,
    amenities: { projector: true, whiteboard: true },
  },
];

async function main(): Promise<void> {
  const reset = process.argv.includes('--reset');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const ds = app.get(DataSource);
  const keycloak = app.get(KeycloakService);

  const companyRepo = ds.getRepository(Company);
  const branchRepo = ds.getRepository(Branch);
  const departmentRepo = ds.getRepository(Department);
  const employeeRepo = ds.getRepository(Employee);
  const roleRepo = ds.getRepository(Role);
  const permissionRepo = ds.getRepository(Permission);
  const slaLevelRepo = ds.getRepository(CompanySlaLevel);
  const productRepo = ds.getRepository(Product);
  const inventoryRepo = ds.getRepository(InventoryItem);
  const supplierRepo = ds.getRepository(Supplier);
  const meetingRoomRepo = ds.getRepository(MeetingRoom);
  const roleQuotaRepo = ds.getRepository(RoleQuota);

  // ── Mode --reset : table rase des données métier ──────────────────────────
  if (reset) {
    logger.log('Reset: purge complète des données métier…');

    // Comptes Keycloak de tous les employés connus avant la purge
    const allEmployees = await employeeRepo.find({ select: ['email'] });
    for (const { email } of allEmployees) {
      await keycloak.deleteUserByEmail(email);
    }

    await ds.query(`
      TRUNCATE TABLE
        notifications, cleaning_stock_requests, cleaning_stock_items,
        cleaning_tasks, cleaning_products, meeting_preparations,
        delivery_tasks, inventory_replenishment_requests,
        order_lines, orders, employee_quota_usage, quotas,
        room_bookings, meeting_service_packages, meeting_rooms,
        vip_replenishment_tasks, inventory_transfers, inventory_items,
        purchase_order_lines, purchase_orders, suppliers,
        role_quotas, role_permissions, roles, permissions,
        company_sla_levels, employees, departments, branches,
        companies, products, audit_logs
      CASCADE
    `);
    logger.log('Reset: tables métier vidées');

    // Permissions + rôles internes système (mêmes seeds qu'au boot)
    await app.get(PermissionsSeeder).onApplicationBootstrap();
    logger.log('Reset: permissions et rôles internes re-seedés');
  }

  // ── Sociétés / branches / départements ────────────────────────────────────
  const companyBySlug = new Map<string, Company>();
  const branchByKey = new Map<string, Branch>(); // `${slug}|${nameEn}`
  const departmentByKey = new Map<string, Department>(); // `${slug}|${branchEn}|${deptEn}`

  for (const c of COMPANIES) {
    let company = await companyRepo.findOne({ where: { slug: c.slug } });
    if (!company) {
      company = await companyRepo.save(
        companyRepo.create({
          slug: c.slug,
          name: c.nameEn,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
          active: true,
        }),
      );
      logger.log(`Société créée : ${c.nameEn}`);
    }
    companyBySlug.set(c.slug, company);

    for (const b of c.branches) {
      let branch = await branchRepo.findOne({
        where: { companyId: company.id, nameEn: b.nameEn },
      });
      if (!branch) {
        branch = await branchRepo.save(
          branchRepo.create({
            companyId: company.id,
            nameAr: b.nameAr,
            nameEn: b.nameEn,
            active: true,
          }),
        );
      }
      branchByKey.set(`${c.slug}|${b.nameEn}`, branch);

      for (const d of b.departments) {
        let dept = await departmentRepo.findOne({
          where: {
            companyId: company.id,
            branchId: branch.id,
            nameEn: d.nameEn,
          },
        });
        if (!dept) {
          dept = await departmentRepo.save(
            departmentRepo.create({
              companyId: company.id,
              branchId: branch.id,
              nameAr: d.nameAr,
              nameEn: d.nameEn,
              active: true,
            }),
          );
        }
        departmentByKey.set(`${c.slug}|${b.nameEn}|${d.nameEn}`, dept);
      }
    }

    // Niveaux de priorité de la société (aucun défaut plateforme)
    for (const [index, l] of PRIORITY_LEVELS.entries()) {
      const existing = await slaLevelRepo.findOne({
        where: { companyId: company.id, code: l.code },
      });
      if (!existing) {
        await slaLevelRepo.save(
          slaLevelRepo.create({
            companyId: company.id,
            code: l.code,
            nameAr: l.nameAr,
            nameEn: l.nameEn,
            targetMinutes: l.targetMinutes,
            active: true,
            sortOrder: index,
          }),
        );
      }
    }
  }

  // ── Catalogue produits (UUID générés) ─────────────────────────────────────
  const productByName = new Map<string, Product>();
  for (const p of PRODUCTS) {
    let product = await productRepo.findOne({ where: { nameEn: p.nameEn } });
    if (!product) {
      product = await productRepo.save(
        productRepo.create({
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          category: p.category,
          type: p.type,
          // allowedRoles null = aucune restriction : tous les rôles clients
          // peuvent commander. Une restriction par nom de rôle (ex. "Employee")
          // se configure au cas par cas depuis la page Produits.
          allowedRoles: null,
          unitCost: p.unitCost,
          active: true,
        }),
      );
    }
    productByName.set(p.nameEn, product);
  }
  logger.log(`Catalogue : ${productByName.size} produits`);

  // ── Stock par branche (alertes incluses) ──────────────────────────────────
  let stockRows = 0;
  for (const c of COMPANIES) {
    const company = companyBySlug.get(c.slug)!;
    for (const b of c.branches) {
      const branch = branchByKey.get(`${c.slug}|${b.nameEn}`)!;
      for (const p of PRODUCTS) {
        const product = productByName.get(p.nameEn)!;
        const existing = await inventoryRepo.findOne({
          where: {
            companyId: company.id,
            branchId: branch.id,
            productId: product.id,
            zone: StockZone.BRANCH,
          },
        });
        if (existing) continue;
        const [quantity, minThreshold, maxThreshold] = p.stock;
        await inventoryRepo.save(
          inventoryRepo.create({
            companyId: company.id,
            branchId: branch.id,
            productId: product.id,
            zone: StockZone.BRANCH,
            quantity,
            minThreshold,
            maxThreshold,
            locationName: p.vipLocation ?? null,
          }),
        );
        stockRows += 1;
      }
    }
  }
  if (stockRows) logger.log(`Stock : ${stockRows} lignes créées`);

  // ── Fournisseurs (ressource Tarhib globale) ─────────────────────────────────
  for (const s of SUPPLIERS) {
    const existing = await supplierRepo.findOne({
      where: { nameEn: s.nameEn },
    });
    if (!existing) {
      await supplierRepo.save(
        supplierRepo.create({
          nameAr: s.nameAr,
          nameEn: s.nameEn,
          contactName: s.contactName,
          email: s.email,
          phone: s.phone,
        }),
      );
    }
  }

  // ── Salles de réunion ─────────────────────────────────────────────────────
  for (const r of MEETING_ROOMS) {
    const company = companyBySlug.get(r.companySlug)!;
    const branch = branchByKey.get(`${r.companySlug}|${r.branchEn}`)!;
    const existing = await meetingRoomRepo.findOne({
      where: { companyId: company.id, nameEn: r.nameEn },
    });
    if (!existing) {
      await meetingRoomRepo.save(
        meetingRoomRepo.create({
          companyId: company.id,
          branchId: branch.id,
          nameAr: r.nameAr,
          nameEn: r.nameEn,
          capacity: r.capacity,
          amenities: r.amenities,
          active: true,
        }),
      );
    }
  }

  // ── Rôle Superadmin (toutes les permissions) ──────────────────────────────
  const allPermissions = await permissionRepo.find();
  let superadminRole = await roleRepo.findOne({
    where: { nameEn: 'Superadmin', scope: RoleScope.TARHIB },
    relations: ['permissions'],
  });
  if (!superadminRole) {
    superadminRole = await roleRepo.save(
      roleRepo.create({
        nameAr: 'سوبر أدمن',
        nameEn: 'Superadmin',
        scope: RoleScope.TARHIB,
        slaPriority: 'P1',
        isSystem: true,
        companyId: null,
        permissions: allPermissions,
      }),
    );
    logger.log('Rôle Superadmin créé (toutes permissions)');
  } else if (superadminRole.permissions.length !== allPermissions.length) {
    superadminRole.permissions = allPermissions;
    await roleRepo.save(superadminRole);
  }

  // ── Rôles clients par société, avec quotas sur produits réels ─────────────
  async function upsertClientRole(
    companySlug: string,
    nameAr: string,
    nameEn: string,
    slaPriority: string,
    permissionKeys: string[],
    quotas: Array<{
      productEn: string;
      periodType: QuotaPeriodType;
      maxQuantity: number;
    }>,
  ): Promise<Role> {
    const company = companyBySlug.get(companySlug)!;
    const permissions = allPermissions.filter((p) =>
      permissionKeys.includes(p.key),
    );
    let role = await roleRepo.findOne({
      where: { nameEn, scope: RoleScope.CLIENT, companyId: company.id },
      relations: ['permissions'],
    });
    if (!role) {
      role = await roleRepo.save(
        roleRepo.create({
          nameAr,
          nameEn,
          scope: RoleScope.CLIENT,
          slaPriority,
          isSystem: false,
          companyId: company.id,
          quotasEnabled: quotas.length > 0,
          permissions,
        }),
      );
      logger.log(
        `Rôle client créé : ${nameEn} (${companySlug}, ${quotas.length} quotas)`,
      );
    } else {
      const currentKeys = new Set((role.permissions ?? []).map((p) => p.key));
      const expectedKeys = new Set(permissionKeys);
      const permissionsChanged =
        currentKeys.size !== expectedKeys.size ||
        [...expectedKeys].some((key) => !currentKeys.has(key));
      if (permissionsChanged || role.quotasEnabled !== quotas.length > 0) {
        role.permissions = permissions;
        role.quotasEnabled = quotas.length > 0;
        await roleRepo.save(role);
        logger.log(`Role client synchronized: ${nameEn} (${companySlug})`);
      }
    }
    await roleQuotaRepo.delete({ roleId: role.id });
    for (const q of quotas) {
      const product = productByName.get(q.productEn);
      if (!product) continue;
      await roleQuotaRepo.save(
        roleQuotaRepo.create({
          roleId: role.id,
          companyId: company.id,
          productId: product.id,
          periodType: q.periodType,
          maxQuantity: q.maxQuantity,
        }),
      );
    }
    return role;
  }

  const basicClientPerms = [
    'catalog.view',
    'order.create',
    'order.view_own',
    'order.reorder',
    'favorite.manage',
    'quota.view',
    'notification.view',
    'profile.edit',
  ];
  const meetingPerms = [
    ...basicClientPerms,
    'meeting.book',
    'meeting.order_services',
  ];
  const approverPerms = [...meetingPerms, 'order.approve', 'meeting.manage'];

  const rolesByCompany = new Map<
    string,
    {
      bankOfficer: Role;
      teller: Role;
      departmentHead: Role;
      branchManager: Role;
      executiveManager: Role;
    }
  >();
  for (const c of COMPANIES) {
    const bankOfficer = await upsertClientRole(
      c.slug,
      'موظف مصرفي',
      'Bank Officer',
      'P3',
      basicClientPerms,
      [
        {
          productEn: 'Black Coffee',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 3,
        },
        {
          productEn: 'Water',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 4,
        },
        {
          productEn: 'Cappuccino',
          periodType: QuotaPeriodType.WEEKLY,
          maxQuantity: 3,
        },
      ],
    );
    const teller = await upsertClientRole(
      c.slug,
      'صراف',
      'Teller',
      'P3',
      basicClientPerms,
      [
        {
          productEn: 'Black Coffee',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 3,
        },
        {
          productEn: 'Water',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 5,
        },
        {
          productEn: 'Coffee',
          periodType: QuotaPeriodType.WEEKLY,
          maxQuantity: 4,
        },
      ],
    );
    const departmentHead = await upsertClientRole(
      c.slug,
      'رئيس قسم',
      'Department Head',
      'P2',
      meetingPerms,
      [
        {
          productEn: 'Black Coffee',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 5,
        },
        {
          productEn: 'Nescafé',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 2,
        },
        {
          productEn: 'Green Tea',
          periodType: QuotaPeriodType.WEEKLY,
          maxQuantity: 4,
        },
      ],
    );
    const branchManager = await upsertClientRole(
      c.slug,
      'مدير فرع',
      'Branch Manager',
      'P2',
      approverPerms,
      [
        {
          productEn: 'Black Coffee',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 6,
        },
        {
          productEn: 'Nescafé',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 3,
        },
        {
          productEn: 'Cappuccino',
          periodType: QuotaPeriodType.WEEKLY,
          maxQuantity: 5,
        },
      ],
    );
    const executiveManager = await upsertClientRole(
      c.slug,
      'مدير إدارة',
      'Executive Manager',
      'P1',
      approverPerms,
      [
        {
          productEn: 'Black Coffee',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 8,
        },
        {
          productEn: 'Nescafé',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 4,
        },
        {
          productEn: 'Green Tea',
          periodType: QuotaPeriodType.WEEKLY,
          maxQuantity: 6,
        },
      ],
    );
    rolesByCompany.set(c.slug, {
      bankOfficer,
      teller,
      departmentHead,
      branchManager,
      executiveManager,
    });
  }

  async function findTarhibRole(nameEn: string): Promise<Role | null> {
    return roleRepo.findOne({ where: { nameEn, scope: RoleScope.TARHIB } });
  }

  async function upsertTarhibRole(
    nameAr: string,
    nameEn: string,
    slaPriority: string,
    permissionKeys: string[],
  ): Promise<Role> {
    const permissions = allPermissions.filter((p) =>
      permissionKeys.includes(p.key),
    );
    let role = await roleRepo.findOne({
      where: { nameEn, scope: RoleScope.TARHIB },
      relations: ['permissions'],
    });
    if (!role) {
      role = await roleRepo.save(
        roleRepo.create({
          nameAr,
          nameEn,
          scope: RoleScope.TARHIB,
          slaPriority,
          isSystem: true,
          companyId: null,
          permissions,
        }),
      );
      logger.log(`Rôle interne créé : ${nameEn}`);
      return role;
    }

    const currentKeys = new Set((role.permissions ?? []).map((p) => p.key));
    const expectedKeys = new Set(permissionKeys);
    const permissionsChanged =
      currentKeys.size !== expectedKeys.size ||
      [...expectedKeys].some((key) => !currentKeys.has(key));
    if (permissionsChanged) {
      role.permissions = permissions;
      role.slaPriority = slaPriority;
      await roleRepo.save(role);
    }
    return role;
  }

  const hospitalityManagerRole = await upsertTarhibRole(
    'مدير الضيافة',
    'Hospitality Manager',
    'P2',
    [
      'order.queue.manage',
      'operations.dashboard.view',
      'operations.branch.supervise',
      'stock.view',
      'report.view',
      'alert.view',
      'profile.edit',
    ],
  );
  const stockManagerRole = await upsertTarhibRole(
    'مسؤول المخزون',
    'Stock Manager',
    'P2',
    [
      'stock.view',
      'stock.manage',
      'stock.transfer',
      'inventory.manage',
      'procurement.view',
      'alert.view',
      'profile.edit',
    ],
  );
  const procurementManagerRole = await upsertTarhibRole(
    'مسؤول المشتريات',
    'Procurement Manager',
    'P2',
    [
      'procurement.view',
      'procurement.manage',
      'procurement.validate',
      'procurement.reject',
      'stock.view',
      'alert.view',
      'profile.edit',
    ],
  );

  // ── Utilisateurs ──────────────────────────────────────────────────────────
  interface SeedUser {
    email: string;
    phone: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
    scope: EmployeeScope;
    role: Role | null;
    companyId: string | null;
    branchId: string | null;
    departmentId: string | null;
    floor?: string | null;
    officeNumber?: string | null;
  }

  async function upsertUser(u: SeedUser): Promise<void> {
    const existing = await employeeRepo.findOne({ where: { email: u.email } });
    if (existing) {
      const changed =
        existing.roleId !== (u.role?.id ?? null) ||
        existing.scope !== u.scope ||
        existing.companyId !== u.companyId ||
        existing.branchId !== u.branchId ||
        existing.departmentId !== u.departmentId ||
        existing.floor !== (u.floor ?? existing.floor) ||
        existing.officeNumber !== (u.officeNumber ?? existing.officeNumber);
      if (changed) {
        existing.roleId = u.role?.id ?? null;
        existing.scope = u.scope;
        existing.companyId = u.companyId;
        existing.branchId = u.branchId;
        existing.departmentId = u.departmentId;
        existing.floor = u.floor ?? existing.floor;
        existing.officeNumber = u.officeNumber ?? existing.officeNumber;
        await employeeRepo.save(existing);
        logger.log(`Utilisateur réaligné : ${u.email}`);
      }
      return;
    }

    let keycloakId: string | null = null;
    try {
      keycloakId = await keycloak.createUser(
        u.email,
        DEFAULT_PASSWORD,
        u.firstNameEn,
        u.lastNameEn,
      );
    } catch {
      logger.warn(`Compte Keycloak non créé pour ${u.email} (existe déjà ?)`);
    }

    await employeeRepo.save(
      employeeRepo.create({
        email: u.email,
        phoneNumber: u.phone,
        firstNameAr: u.firstNameAr,
        lastNameAr: u.lastNameAr,
        firstNameEn: u.firstNameEn,
        lastNameEn: u.lastNameEn,
        companyId: u.companyId,
        branchId: u.branchId,
        departmentId: u.departmentId,
        floor: u.floor ?? null,
        officeNumber: u.officeNumber ?? null,
        role: u.role?.nameEn ?? undefined,
        roleId: u.role?.id ?? null,
        scope: u.scope,
        active: true,
        status: EmployeeStatus.ACTIVE,
        keycloakId,
      }),
    );
    logger.log(
      `Utilisateur créé : ${u.email} (${u.role?.nameEn ?? 'sans rôle'})`,
    );
  }

  const oasis = companyBySlug.get('masraf-al-waha')!;
  const oasisHq = branchByKey.get(
    'masraf-al-waha|General Administration - Tripoli',
  )!;
  const hayAndalus = branchByKey.get('masraf-al-waha|Hay Al-Andalus Branch')!;
  const zawiya = branchByKey.get('masraf-al-waha|Zawiya Branch')!;
  const souqJumaa = branchByKey.get('masraf-al-waha|Souq Al-Jumaa Branch')!;
  const datAlImad = branchByKey.get('masraf-al-waha|Dat Al-Imad Branch')!;
  const zliten = branchByKey.get('masraf-al-waha|Zliten Branch')!;
  const dep = (k: string) => departmentByKey.get(k)!;

  // Internes : dispatchés en mission sur les sites clients (فرع, pas de قسم)
  await upsertUser({
    email: 'superadmin@tarhib.app',
    phone: '+218910100001',
    firstNameAr: 'سامي',
    lastNameAr: 'الورفلي',
    firstNameEn: 'Sami',
    lastNameEn: 'Al-Werfalli',
    scope: EmployeeScope.TARHIB,
    role: superadminRole,
    companyId: null,
    branchId: null,
    departmentId: null,
  });
  await upsertUser({
    email: 'admin@tarhib.app',
    phone: '+218910100002',
    firstNameAr: 'نادية',
    lastNameAr: 'الطرابلسي',
    firstNameEn: 'Nadia',
    lastNameEn: 'Al-Trabulsi',
    scope: EmployeeScope.TARHIB,
    role: await findTarhibRole('Branch Manager'),
    companyId: oasis.id,
    branchId: oasisHq.id,
    departmentId: null,
  });
  await upsertUser({
    email: 'manager@tarhib.app',
    phone: '+218910100003',
    firstNameAr: 'محمود',
    lastNameAr: 'السنوسي',
    firstNameEn: 'Mahmoud',
    lastNameEn: 'Al-Senussi',
    scope: EmployeeScope.TARHIB,
    role: hospitalityManagerRole,
    companyId: oasis.id,
    branchId: oasisHq.id,
    departmentId: null,
  });
  await upsertUser({
    email: 'chef@tarhib.app',
    phone: '+218910100004',
    firstNameAr: 'خالد',
    lastNameAr: 'الغرياني',
    firstNameEn: 'Khaled',
    lastNameEn: 'Al-Gharyani',
    scope: EmployeeScope.TARHIB,
    role: await findTarhibRole('Cook'),
    companyId: oasis.id,
    branchId: oasisHq.id,
    departmentId: null,
  });
  await upsertUser({
    email: 'livreur@tarhib.app',
    phone: '+218910100005',
    firstNameAr: 'أيمن',
    lastNameAr: 'المصراتي',
    firstNameEn: 'Ayman',
    lastNameEn: 'Al-Misrati',
    scope: EmployeeScope.TARHIB,
    role: await findTarhibRole('Delivery Agent'),
    companyId: oasis.id,
    branchId: hayAndalus.id,
    departmentId: null,
  });
  await upsertUser({
    email: 'stock@tarhib.app',
    phone: '+218910100006',
    firstNameAr: 'فتحي',
    lastNameAr: 'بن عمران',
    firstNameEn: 'Fathi',
    lastNameEn: 'Ben Omran',
    scope: EmployeeScope.TARHIB,
    role: stockManagerRole,
    companyId: oasis.id,
    branchId: oasisHq.id,
    departmentId: null,
  });
  await upsertUser({
    email: 'achats@tarhib.app',
    phone: '+218910100007',
    firstNameAr: 'ريم',
    lastNameAr: 'الدرسي',
    firstNameEn: 'Reem',
    lastNameEn: 'Al-Dersi',
    scope: EmployeeScope.TARHIB,
    role: procurementManagerRole,
    companyId: oasis.id,
    branchId: oasisHq.id,
    departmentId: null,
  });
  await upsertUser({
    email: 'superviseur@tarhib.app',
    phone: '+218910100008',
    firstNameAr: 'ليلى',
    lastNameAr: 'الشريف',
    firstNameEn: 'Leila',
    lastNameEn: 'Al-Sharif',
    scope: EmployeeScope.TARHIB,
    role: await findTarhibRole('Supervisor'),
    companyId: oasis.id,
    branchId: datAlImad.id,
    departmentId: null,
  });

  // Externes : employés des sociétés clientes (app mobile uniquement)
  const extraOperationsUsers: SeedUser[] = [
    {
      email: 'direction@tarhib.app',
      phone: '+218910100009',
      firstNameAr: 'أحمد',
      lastNameAr: 'المدير',
      firstNameEn: 'Ahmed',
      lastNameEn: 'Director',
      scope: EmployeeScope.TARHIB,
      role: await findTarhibRole('General Director'),
      companyId: null,
      branchId: null,
      departmentId: null,
    },
    {
      email: 'sous.direction@tarhib.app',
      phone: '+218910100010',
      firstNameAr: 'مريم',
      lastNameAr: 'النائب',
      firstNameEn: 'Mariam',
      lastNameEn: 'Deputy',
      scope: EmployeeScope.TARHIB,
      role: await findTarhibRole('Deputy Director'),
      companyId: oasis.id,
      branchId: oasisHq.id,
      departmentId: null,
    },
    {
      email: 'nettoyage.manager@tarhib.app',
      phone: '+218910100011',
      firstNameAr: 'سارة',
      lastNameAr: 'المشرفة',
      firstNameEn: 'Sara',
      lastNameEn: 'Cleaning Manager',
      scope: EmployeeScope.TARHIB,
      role: await findTarhibRole('Hospitality and Cleaning Manager'),
      companyId: oasis.id,
      branchId: oasisHq.id,
      departmentId: null,
    },
    {
      email: 'hospitalite@tarhib.app',
      phone: '+218910100012',
      firstNameAr: 'علي',
      lastNameAr: 'الضيافة',
      firstNameEn: 'Ali',
      lastNameEn: 'Hospitality',
      scope: EmployeeScope.TARHIB,
      role: await findTarhibRole('Hospitality Agent'),
      companyId: oasis.id,
      branchId: oasisHq.id,
      departmentId: null,
    },
    {
      email: 'nettoyage@tarhib.app',
      phone: '+218910100013',
      firstNameAr: 'خديجة',
      lastNameAr: 'النظافة',
      firstNameEn: 'Khadija',
      lastNameEn: 'Cleaner',
      scope: EmployeeScope.TARHIB,
      role: await findTarhibRole('Cleaner'),
      companyId: oasis.id,
      branchId: oasisHq.id,
      departmentId: null,
    },
    {
      email: 'vip@tarhib.app',
      phone: '+218910100014',
      firstNameAr: 'يوسف',
      lastNameAr: 'كبار الضيوف',
      firstNameEn: 'Youssef',
      lastNameEn: 'VIP',
      scope: EmployeeScope.TARHIB,
      role: await findTarhibRole('VIP Replenishment Agent'),
      companyId: oasis.id,
      branchId: oasisHq.id,
      departmentId: null,
    },
  ];
  for (const user of extraOperationsUsers) await upsertUser(user);

  await upsertUser({
    email: 'salma.alfaitouri@alwaha-bank.ly',
    phone: '+218920200001',
    firstNameAr: 'سلمى',
    lastNameAr: 'الفيتوري',
    firstNameEn: 'Salma',
    lastNameEn: 'Al-Faitouri',
    scope: EmployeeScope.CLIENT,
    role: rolesByCompany.get('masraf-al-waha')!.executiveManager,
    companyId: oasis.id,
    branchId: oasisHq.id,
    departmentId: dep(
      'masraf-al-waha|General Administration - Tripoli|Administrative Affairs and Facilities',
    ).id,
  });
  await upsertUser({
    email: 'omar.alhouni@alwaha-bank.ly',
    phone: '+218920200002',
    firstNameAr: 'عمر',
    lastNameAr: 'الهوني',
    firstNameEn: 'Omar',
    lastNameEn: 'Al-Houni',
    scope: EmployeeScope.CLIENT,
    role: rolesByCompany.get('masraf-al-waha')!.departmentHead,
    companyId: oasis.id,
    branchId: oasisHq.id,
    departmentId: dep(
      'masraf-al-waha|General Administration - Tripoli|Information Technology',
    ).id,
  });
  await upsertUser({
    email: 'youssef.aburas@alwaha-bank.ly',
    phone: '+218920200003',
    firstNameAr: 'يوسف',
    lastNameAr: 'أبوراس',
    firstNameEn: 'Youssef',
    lastNameEn: 'Aburas',
    scope: EmployeeScope.CLIENT,
    role: rolesByCompany.get('masraf-al-waha')!.branchManager,
    companyId: oasis.id,
    branchId: hayAndalus.id,
    departmentId: dep('masraf-al-waha|Hay Al-Andalus Branch|Banking Operations')
      .id,
  });
  await upsertUser({
    email: 'fatima.alzawi@alwaha-bank.ly',
    phone: '+218920200004',
    firstNameAr: 'فاطمة',
    lastNameAr: 'الزاوي',
    firstNameEn: 'Fatima',
    lastNameEn: 'Al-Zawi',
    scope: EmployeeScope.CLIENT,
    role: rolesByCompany.get('masraf-al-waha')!.teller,
    companyId: oasis.id,
    branchId: zawiya.id,
    departmentId: dep('masraf-al-waha|Zawiya Branch|Customer Service').id,
  });
  await upsertUser({
    email: 'mohamed.bensalem@alwaha-bank.ly',
    phone: '+218920200005',
    firstNameAr: 'محمد',
    lastNameAr: 'بن سالم',
    firstNameEn: 'Mohamed',
    lastNameEn: 'Ben Salem',
    scope: EmployeeScope.CLIENT,
    role: rolesByCompany.get('masraf-al-waha')!.bankOfficer,
    companyId: oasis.id,
    branchId: souqJumaa.id,
    departmentId: dep('masraf-al-waha|Souq Al-Jumaa Branch|Current Accounts')
      .id,
  });
  await upsertUser({
    email: 'hanan.alobeidi@alwaha-bank.ly',
    phone: '+218920200006',
    firstNameAr: 'حنان',
    lastNameAr: 'العبيدي',
    firstNameEn: 'Hanan',
    lastNameEn: 'Al-Obeidi',
    scope: EmployeeScope.CLIENT,
    role: rolesByCompany.get('masraf-al-waha')!.departmentHead,
    companyId: oasis.id,
    branchId: datAlImad.id,
    departmentId: dep('masraf-al-waha|Dat Al-Imad Branch|Premium Banking').id,
  });
  await upsertUser({
    email: 'abdullah.alzliteny@alwaha-bank.ly',
    phone: '+218920200007',
    firstNameAr: 'عبدالله',
    lastNameAr: 'الزليتني',
    firstNameEn: 'Abdullah',
    lastNameEn: 'Al-Zliteny',
    scope: EmployeeScope.CLIENT,
    role: rolesByCompany.get('masraf-al-waha')!.bankOfficer,
    companyId: oasis.id,
    branchId: zliten.id,
    departmentId: dep('masraf-al-waha|Zliten Branch|Transfers').id,
  });

  // ── Commandes de démonstration (pour visualiser le rendu des rapports) ────
  // Uniquement si aucune commande n'existe déjà (idempotent comme le reste :
  // --reset vide la table avant, donc ce bloc s'exécute toujours après reset).
  const orderRepo = ds.getRepository(Order);
  if ((await orderRepo.count()) === 0) {
    const ordersService = app.get(OrdersService);

    const demoEmployees = [
      { email: 'salma.alfaitouri@alwaha-bank.ly' },
      { email: 'omar.alhouni@alwaha-bank.ly' },
      { email: 'youssef.aburas@alwaha-bank.ly' },
      { email: 'fatima.alzawi@alwaha-bank.ly' },
      { email: 'mohamed.bensalem@alwaha-bank.ly' },
      { email: 'hanan.alobeidi@alwaha-bank.ly' },
      { email: 'abdullah.alzliteny@alwaha-bank.ly' },
    ];
    const employeeRecords = new Map<string, Employee>();
    for (const e of demoEmployees) {
      const rec = await employeeRepo.findOne({ where: { email: e.email } });
      if (rec) employeeRecords.set(e.email, rec);
    }
    const chefRec = await employeeRepo.findOne({
      where: { email: 'chef@tarhib.app' },
    });
    const livreurRec = await employeeRepo.findOne({
      where: { email: 'livreur@tarhib.app' },
    });

    // Produits sans quota configuré (jamais de rejet de ligne) pour le gros
    // du volume ; quelques produits à quota pour varier le "top produits".
    const safeProducts = ['Black Tea', 'Cappuccino', 'Green Tea', 'Coffee'];
    const varietyProducts = [
      'Black Coffee',
      'Nescafé',
      'Green Tea',
      'Cappuccino',
    ];

    type FinalState =
      | 'DELIVERED_ON_TIME'
      | 'DELIVERED_LATE'
      | 'REJECTED'
      | 'IN_PROGRESS'
      | 'PENDING';
    const plan: Array<{
      daysAgo: number;
      email: string;
      productEn: string;
      finalState: FinalState;
    }> = [];

    let i = 0;
    for (let day = 20; day >= 0; day--) {
      const ordersToday = day % 3 === 0 ? 2 : 1;
      for (let k = 0; k < ordersToday; k++) {
        const email = demoEmployees[i % demoEmployees.length].email;
        const useVariety = i % 5 === 0;
        const productEn = useVariety
          ? varietyProducts[i % varietyProducts.length]
          : safeProducts[i % safeProducts.length];
        let finalState: FinalState;
        if (day === 0 && k === ordersToday - 1) finalState = 'PENDING';
        else if (day <= 1 && i % 4 === 1) finalState = 'IN_PROGRESS';
        else if (i % 9 === 4) finalState = 'REJECTED';
        else if (i % 11 === 7) finalState = 'DELIVERED_LATE';
        else finalState = 'DELIVERED_ON_TIME';
        plan.push({ daysAgo: day, email, productEn, finalState });
        i += 1;
      }
    }

    let created = 0;
    const processedOrderIds = new Set<string>();
    for (const [idx, item] of plan.entries()) {
      const emp = employeeRecords.get(item.email);
      const product = productByName.get(item.productEn);
      if (!emp || !product || !emp.keycloakId) continue;

      const caller: JwtPayload = {
        sub: emp.keycloakId,
        email: emp.email,
        role: 'EMPLOYEE',
        roleId: emp.roleId ?? undefined,
        permissions: [],
        companyId: emp.companyId!,
        branchId: emp.branchId!,
      };

      let orderId: string | null = null;
      try {
        const result = await ordersService.create(
          { lines: [{ productId: product.id, quantity: 1 + (idx % 2) }] },
          caller,
        );
        orderId = result.id;
      } catch {
        // create() peut enregistrer la commande avec succès puis lever une
        // erreur ensuite (gateway WebSocket absent en contexte de script,
        // sans serveur HTTP/WS démarré) — la ligne peut aussi avoir été
        // rejetée (quota/stock) avant tout enregistrement. On distingue les
        // deux cas par IDENTITÉ plutôt que par horloge murale (le conteneur
        // DB peut avoir un décalage d'horloge/fuseau vs le process Node) :
        // la commande la plus récente de l'employé, si jamais réclamée par
        // une itération précédente, est bien la nôtre.
        const latest = await orderRepo.findOne({
          where: { employeeId: emp.keycloakId },
          order: { createdAt: 'DESC' },
        });
        if (latest && !processedOrderIds.has(latest.id)) {
          orderId = latest.id;
        }
      }
      if (!orderId || processedOrderIds.has(orderId)) continue;
      processedOrderIds.add(orderId);

      const order = await orderRepo.findOne({ where: { id: orderId } });
      if (!order) continue;

      // Capture le délai SLA d'origine (slaMinutes) avant d'écraser createdAt,
      // pour le recaler sur la nouvelle date sans changer sa durée.
      const slaOffsetMs =
        order.slaDeadline.getTime() - order.createdAt.getTime();
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - item.daysAgo);
      createdAt.setHours(9 + (idx % 8), (idx * 7) % 60, 0, 0);
      order.createdAt = createdAt;
      order.slaDeadline = new Date(createdAt.getTime() + slaOffsetMs);

      switch (item.finalState) {
        case 'PENDING':
          break;
        case 'IN_PROGRESS':
          order.status = OrderStatus.IN_PROGRESS;
          order.prepStartedAt = new Date(createdAt.getTime() + 3 * 60_000);
          order.preparedBy = chefRec?.keycloakId ?? null;
          break;
        case 'REJECTED':
          order.status = OrderStatus.REJECTED;
          break;
        case 'DELIVERED_ON_TIME':
        case 'DELIVERED_LATE': {
          const prepMinutes = 2 + (idx % 3);
          const readyMinutes = prepMinutes + 6 + (idx % 5);
          const deliverMinutes =
            item.finalState === 'DELIVERED_LATE'
              ? readyMinutes + 25 + (idx % 10)
              : readyMinutes + 3 + (idx % 4);
          order.status = OrderStatus.DELIVERED;
          order.prepStartedAt = new Date(
            createdAt.getTime() + prepMinutes * 60_000,
          );
          order.readyAt = new Date(createdAt.getTime() + readyMinutes * 60_000);
          order.deliveredAt = new Date(
            createdAt.getTime() + deliverMinutes * 60_000,
          );
          order.preparedBy = chefRec?.keycloakId ?? null;
          order.deliveredBy = livreurRec?.keycloakId ?? null;
          break;
        }
      }

      await orderRepo.save(order);
      created += 1;
    }
    logger.log(`Commandes de démonstration créées : ${created}`);
  }

  // ── Bons de commande de démonstration (onglet Achats des rapports) ────────
  const poRepo = ds.getRepository(PurchaseOrder);
  if ((await poRepo.count()) === 0) {
    const procurementService = app.get(ProcurementService);
    const supplierRecords = await supplierRepo.find();
    const managerRec = await employeeRepo.findOne({
      where: { email: 'achats@tarhib.app' },
    });

    if (supplierRecords.length && managerRec?.keycloakId) {
      const poPlan: Array<{
        daysAgo: number;
        supplierIdx: number;
        productEn: string;
        qty: number;
        unitCost: number;
        status: PurchaseOrderStatus;
      }> = [
        {
          daysAgo: 14,
          supplierIdx: 0,
          productEn: 'Black Coffee',
          qty: 20,
          unitCost: 75,
          status: PurchaseOrderStatus.RECEIVED,
        },
        {
          daysAgo: 12,
          supplierIdx: 1,
          productEn: 'Water',
          qty: 100,
          unitCost: 28,
          status: PurchaseOrderStatus.RECEIVED,
        },
        {
          daysAgo: 9,
          supplierIdx: 2,
          productEn: 'Coffee',
          qty: 40,
          unitCost: 85,
          status: PurchaseOrderStatus.RECEIVED,
        },
        {
          daysAgo: 6,
          supplierIdx: 0,
          productEn: 'Black Tea',
          qty: 30,
          unitCost: 95,
          status: PurchaseOrderStatus.SENT,
        },
        {
          daysAgo: 4,
          supplierIdx: 1,
          productEn: 'Nescafé',
          qty: 25,
          unitCost: 140,
          status: PurchaseOrderStatus.SENT,
        },
        {
          daysAgo: 2,
          supplierIdx: 2,
          productEn: 'Cappuccino',
          qty: 15,
          unitCost: 110,
          status: PurchaseOrderStatus.PARTIALLY_RECEIVED,
        },
      ];

      let poCreated = 0;
      for (const item of poPlan) {
        const supplier =
          supplierRecords[item.supplierIdx % supplierRecords.length];
        const product = productByName.get(item.productEn);
        if (!supplier || !product) continue;

        const dto = await procurementService.create(
          {
            companyId: oasis.id,
            branchId: oasisHq.id,
            supplierId: supplier.id,
            lines: [
              {
                productId: product.id,
                orderedQty: item.qty,
                unitCost: item.unitCost,
              },
            ],
          },
          managerRec.keycloakId,
        );

        const po = await poRepo.findOne({ where: { id: dto.id } });
        if (!po) continue;

        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - item.daysAgo);
        createdAt.setHours(10, 0, 0, 0);
        po.createdAt = createdAt;
        po.status = item.status;
        if (item.status !== PurchaseOrderStatus.DRAFT) {
          const line = po.lines[0];
          if (line) {
            line.receivedQty =
              item.status === PurchaseOrderStatus.PARTIALLY_RECEIVED
                ? Math.round(item.qty / 2)
                : item.status === PurchaseOrderStatus.RECEIVED
                  ? item.qty
                  : 0;
            await ds.getRepository(PurchaseOrderLine).save(line);
          }
        }
        await poRepo.save(po);
        poCreated += 1;
      }
      logger.log(`Bons de commande de démonstration créés : ${poCreated}`);
    }
  }

  logger.log('Seed terminé ✔ — mot de passe commun : Tarhib@2026!');
  // Operations 2.0 test fixtures.
  const cleaner = await employeeRepo.findOne({
    where: { email: 'nettoyage@tarhib.app' },
  });
  const hospitalityAgent = await employeeRepo.findOne({
    where: { email: 'hospitalite@tarhib.app' },
  });
  const cleaningManager = await employeeRepo.findOne({
    where: { email: 'nettoyage.manager@tarhib.app' },
  });
  const stockManager = await employeeRepo.findOne({
    where: { email: 'stock@tarhib.app' },
  });
  const deliveryAgent = await employeeRepo.findOne({
    where: { email: 'livreur@tarhib.app' },
  });
  const clientEmployees = await employeeRepo.find({
    where: { scope: EmployeeScope.CLIENT },
  });
  for (const [index, employee] of clientEmployees.entries()) {
    employee.floor = `${1 + (index % 6)}`;
    employee.officeNumber = `${100 + index}`;
  }
  await employeeRepo.save(clientEmployees);

  // Complete the mobile procurement state matrix left intentionally active.
  const procurementActor =
    (await employeeRepo.findOne({ where: { email: 'achats@tarhib.app' } })) ??
    stockManager;
  const procurementSupplier = await supplierRepo.findOne({ where: {} });
  if (procurementActor && procurementSupplier) {
    const procurementService = app.get(ProcurementService);
    for (const status of [
      PurchaseOrderStatus.DRAFT,
      PurchaseOrderStatus.PENDING_VALIDATION,
      PurchaseOrderStatus.VALIDATED,
      PurchaseOrderStatus.CANCELLED,
    ]) {
      if (!(await poRepo.findOne({ where: { status } }))) {
        const created = await procurementService.create(
          {
            companyId: oasis.id,
            branchId: oasisHq.id,
            supplierId: procurementSupplier.id,
            notes: `Seed fixture · ${status}`,
            lines: [
              {
                productId: productByName.get('Water')!.id,
                orderedQty: 10,
                unitCost: 28,
              },
            ],
          },
          procurementActor.keycloakId ?? procurementActor.id,
        );
        const order = await poRepo.findOne({ where: { id: created.id } });
        if (order) {
          order.status = status;
          if (status === PurchaseOrderStatus.CANCELLED) {
            order.cancelledBy = procurementActor.id;
            order.cancelledAt = new Date();
          }
          await poRepo.save(order);
        }
      }
    }
  }

  for (const productName of ['Black Coffee', 'Water', 'Green Tea']) {
    const product = productByName.get(productName)!;
    for (const [zone, quantity] of [
      [StockZone.CENTRAL, 250],
      [StockZone.KITCHEN, productName === 'Green Tea' ? 3 : 25],
    ] as const) {
      const existing = await inventoryRepo.findOne({
        where: {
          companyId: oasis.id,
          branchId: oasisHq.id,
          productId: product.id,
          zone,
        },
      });
      if (!existing)
        await inventoryRepo.save(
          inventoryRepo.create({
            companyId: oasis.id,
            branchId: oasisHq.id,
            productId: product.id,
            zone,
            quantity,
            minThreshold: 10,
            maxThreshold: 300,
            locationName:
              zone === StockZone.KITCHEN ? 'Main kitchen' : 'Central warehouse',
            departmentId: null,
            assignedEmployeeId: null,
          }),
        );
    }
  }

  const transferRepo = ds.getRepository(InventoryTransfer);
  if ((await transferRepo.count()) === 0 && stockManager) {
    const product = productByName.get('Black Coffee')!;
    await transferRepo.save([
      transferRepo.create({
        companyId: oasis.id,
        branchId: oasisHq.id,
        productId: product.id,
        fromZone: StockZone.BRANCH,
        toZone: StockZone.KITCHEN,
        quantity: 12,
        status: TransferStatus.PENDING,
        requestedBy: stockManager.id,
        confirmedBy: null,
        note: 'Kitchen morning replenishment',
        confirmedAt: null,
        cancelledBy: null,
        cancelledAt: null,
      }),
      transferRepo.create({
        companyId: oasis.id,
        branchId: oasisHq.id,
        productId: product.id,
        fromZone: StockZone.CENTRAL,
        toZone: StockZone.BRANCH,
        quantity: 40,
        status: TransferStatus.CONFIRMED,
        requestedBy: stockManager.id,
        confirmedBy: stockManager.id,
        note: 'Weekly branch replenishment',
        confirmedAt: new Date(),
        cancelledBy: null,
        cancelledAt: null,
      }),
      transferRepo.create({
        companyId: oasis.id,
        branchId: oasisHq.id,
        productId: product.id,
        fromZone: StockZone.BRANCH,
        toZone: StockZone.KITCHEN,
        quantity: 5,
        status: TransferStatus.CANCELLED,
        requestedBy: stockManager.id,
        confirmedBy: null,
        note: 'Duplicate request',
        confirmedAt: null,
        cancelledBy: stockManager.id,
        cancelledAt: new Date(),
      }),
    ]);
  }
  const replenishmentRepo = ds.getRepository(InventoryReplenishmentRequest);
  if ((await replenishmentRepo.count()) === 0 && hospitalityAgent) {
    await replenishmentRepo.save([
      replenishmentRepo.create({
        companyId: oasis.id,
        branchId: oasisHq.id,
        productId: productByName.get('Green Tea')!.id,
        requestedQty: 20,
        requestedBy: hospitalityAgent.id,
        approvedBy: null,
        transferId: null,
        status: ReplenishmentStatus.REQUESTED,
        note: 'Kitchen stock below threshold',
      }),
      replenishmentRepo.create({
        companyId: oasis.id,
        branchId: oasisHq.id,
        productId: productByName.get('Water')!.id,
        requestedQty: 30,
        requestedBy: hospitalityAgent.id,
        approvedBy: stockManager?.id ?? null,
        transferId: null,
        status: ReplenishmentStatus.APPROVED,
        note: 'Approved for afternoon service',
      }),
    ]);
  }

  const cleaningProductRepo = ds.getRepository(CleaningProduct);
  const cleaningProductByName = new Map<string, CleaningProduct>();
  for (const definition of [
    {
      nameAr: 'منظف متعدد الاستعمالات',
      nameEn: 'Multi-purpose cleaner',
      category: 'Cleaning agents',
      unit: 'bottle',
      unitCost: 18,
    },
    {
      nameAr: 'أكياس نفايات',
      nameEn: 'Waste bags',
      category: 'Consumables',
      unit: 'roll',
      unitCost: 12,
    },
    {
      nameAr: 'مناديل ورقية',
      nameEn: 'Paper towels',
      category: 'Consumables',
      unit: 'pack',
      unitCost: 9,
    },
  ]) {
    let product = await cleaningProductRepo.findOne({
      where: { nameEn: definition.nameEn },
    });
    if (!product)
      product = await cleaningProductRepo.save(
        cleaningProductRepo.create({
          ...definition,
          imageUrl: null,
          active: true,
        }),
      );
    cleaningProductByName.set(product.nameEn, product);
  }
  const cleaningStockRepo = ds.getRepository(CleaningStockItem);
  for (const [index, product] of [
    ...cleaningProductByName.values(),
  ].entries()) {
    if (
      !(await cleaningStockRepo.findOne({
        where: {
          companyId: oasis.id,
          branchId: oasisHq.id,
          cleaningProductId: product.id,
        },
      }))
    ) {
      await cleaningStockRepo.save(
        cleaningStockRepo.create({
          companyId: oasis.id,
          branchId: oasisHq.id,
          cleaningProductId: product.id,
          quantity: index === 1 ? 2 : 18,
          minThreshold: 5,
          maxThreshold: 30,
          locationName: 'Facilities store',
        }),
      );
    }
  }
  const cleaningRequestRepo = ds.getRepository(CleaningStockRequest);
  if ((await cleaningRequestRepo.count()) === 0 && cleaner) {
    await cleaningRequestRepo.save([
      cleaningRequestRepo.create({
        companyId: oasis.id,
        branchId: oasisHq.id,
        cleaningProductId: cleaningProductByName.get('Waste bags')!.id,
        requestedQty: 10,
        requestedBy: cleaner.id,
        status: CleaningStockRequestStatus.REQUESTED,
        note: 'Low stock for tomorrow',
      }),
      cleaningRequestRepo.create({
        companyId: oasis.id,
        branchId: oasisHq.id,
        cleaningProductId: cleaningProductByName.get('Paper towels')!.id,
        requestedQty: 12,
        requestedBy: cleaner.id,
        status: CleaningStockRequestStatus.FULFILLED,
        note: 'Delivered to facilities store',
      }),
    ]);
  }

  const bookingRepo = ds.getRepository(RoomBooking);
  const preparationRepo = ds.getRepository(MeetingPreparation);
  const taskRepo = ds.getRepository(CleaningTask);
  const rooms = await meetingRoomRepo.find({ where: { companyId: oasis.id } });
  if (
    (await bookingRepo.count()) === 0 &&
    rooms.length &&
    clientEmployees.length
  ) {
    const now = Date.now();
    const definitions = [
      { offset: 2, status: BookingStatus.CONFIRMED },
      { offset: 6, status: BookingStatus.CONFIRMED },
      { offset: 28, status: BookingStatus.CONFIRMED },
      { offset: -4, status: BookingStatus.COMPLETED },
      { offset: 48, status: BookingStatus.CANCELLED },
    ];
    for (const [index, definition] of definitions.entries()) {
      const room = rooms[index % rooms.length];
      const booking = await bookingRepo.save(
        bookingRepo.create({
          roomId: room.id,
          employeeId: clientEmployees[index % clientEmployees.length].id,
          companyId: oasis.id,
          startTime: new Date(now + definition.offset * 3_600_000),
          endTime: new Date(now + (definition.offset + 1) * 3_600_000),
          status: definition.status,
          services: {
            package: index % 2 ? 'BREAKFAST' : 'LUNCH',
            participants: 6 + index,
          },
        }),
      );
      if (definition.status === BookingStatus.CONFIRMED) {
        await preparationRepo.save(
          preparationRepo.create({
            bookingId: booking.id,
            companyId: oasis.id,
            branchId: room.branchId,
            assignedEmployeeId:
              index === 0 ? (hospitalityAgent?.id ?? null) : null,
            status:
              index === 0
                ? MeetingPreparationStatus.ASSIGNED
                : MeetingPreparationStatus.PENDING,
            checklist: [
              { key: 'room', label: 'Room set up', done: false },
              { key: 'equipment', label: 'Equipment tested', done: false },
              {
                key: 'service',
                label: 'Drinks and service prepared',
                done: false,
              },
              { key: 'control', label: 'Final check', done: false },
            ],
            startedAt: null,
            readyAt: null,
            completedAt: null,
            verifiedBy: null,
          }),
        );
      } else if (definition.status === BookingStatus.COMPLETED) {
        await taskRepo.save(
          taskRepo.create({
            companyId: oasis.id,
            branchId: room.branchId,
            title: `Meeting room reset · ${room.nameEn}`,
            description: `${room.nameAr} / ${room.nameEn}`,
            sourceBookingId: booking.id,
            roomId: room.id,
            scheduledStartAt: booking.endTime,
            scheduledEndAt: new Date(booking.endTime.getTime() + 30 * 60_000),
            assignedEmployeeId: cleaner?.id ?? null,
            status: CleaningTaskStatus.DONE,
            dueDate: booking.endTime.toISOString().slice(0, 10),
            recurrence: CleaningTaskRecurrence.ONCE,
            completedAt: new Date(),
            verifiedByEmployeeId: cleaningManager?.id ?? null,
            verifiedAt: null,
            notes: 'Automatic post-meeting task',
          }),
        );
      }
    }
  }
  if ((await taskRepo.count()) < 4) {
    const today = new Date().toISOString().slice(0, 10);
    await taskRepo.save([
      taskRepo.create({
        companyId: oasis.id,
        branchId: oasisHq.id,
        title: 'Morning lobby inspection',
        description: 'Clean and inspect the main lobby',
        sourceBookingId: null,
        roomId: null,
        scheduledStartAt: null,
        scheduledEndAt: null,
        assignedEmployeeId: cleaner?.id ?? null,
        status: CleaningTaskStatus.ASSIGNED,
        dueDate: today,
        recurrence: CleaningTaskRecurrence.DAILY,
        completedAt: null,
        verifiedByEmployeeId: null,
        verifiedAt: null,
        notes: null,
      }),
      taskRepo.create({
        companyId: oasis.id,
        branchId: oasisHq.id,
        title: 'Executive floor deep clean',
        description: 'Weekly deep-cleaning rotation',
        sourceBookingId: null,
        roomId: null,
        scheduledStartAt: null,
        scheduledEndAt: null,
        assignedEmployeeId: null,
        status: CleaningTaskStatus.PENDING,
        dueDate: today,
        recurrence: CleaningTaskRecurrence.WEEKLY,
        completedAt: null,
        verifiedByEmployeeId: null,
        verifiedAt: null,
        notes: 'Ready for manager assignment',
      }),
      taskRepo.create({
        companyId: oasis.id,
        branchId: oasisHq.id,
        title: 'Cafeteria closing clean',
        description: 'Completed task awaiting verification',
        sourceBookingId: null,
        roomId: null,
        scheduledStartAt: null,
        scheduledEndAt: null,
        assignedEmployeeId: cleaner?.id ?? null,
        status: CleaningTaskStatus.DONE,
        dueDate: today,
        recurrence: CleaningTaskRecurrence.DAILY,
        completedAt: new Date(),
        verifiedByEmployeeId: null,
        verifiedAt: null,
        notes: null,
      }),
    ]);
  }

  const deliveryRepo = ds.getRepository(DeliveryTask);
  if ((await deliveryRepo.count()) === 0) {
    const candidates = await orderRepo.find({
      take: 4,
      order: { createdAt: 'DESC' },
    });
    for (const [index, order] of candidates.entries()) {
      order.status = OrderStatus.READY;
      order.readyAt = new Date(Date.now() - index * 5 * 60_000);
      await orderRepo.save(order);
      const statuses = [
        DeliveryTaskStatus.AVAILABLE,
        DeliveryTaskStatus.ASSIGNED,
        DeliveryTaskStatus.OUT_FOR_DELIVERY,
        DeliveryTaskStatus.ISSUE_REPORTED,
      ];
      await deliveryRepo.save(
        deliveryRepo.create({
          orderId: order.id,
          companyId: order.companyId,
          branchId: order.branchId,
          assignedEmployeeId: index ? (deliveryAgent?.id ?? null) : null,
          status: statuses[index],
          issueReason: index === 3 ? 'Recipient unavailable at office' : null,
          pickedUpAt: index >= 2 ? new Date() : null,
          deliveredAt: null,
        }),
      );
    }
  }

  const notificationRepo = ds.getRepository(Notification);
  if ((await notificationRepo.count()) === 0) {
    const recipients = [
      deliveryAgent,
      cleaner,
      stockManager,
      cleaningManager,
    ].filter((item): item is Employee => Boolean(item));
    const domains = ['delivery', 'cleaning', 'stock', 'meeting'];
    for (const [index, recipient] of recipients.entries()) {
      await notificationRepo.save(
        notificationRepo.create({
          employeeId: recipient.id,
          domain: domains[index],
          titleAr: 'إشعار تجريبي',
          titleEn: 'Demo notification',
          bodyAr: 'عنصر جديد يحتاج إلى انتباهك',
          bodyEn: 'A new item requires your attention',
          referenceId: null,
          data: { seeded: 'true' },
          readAt: index % 2 ? new Date() : null,
        }),
      );
    }
  }
  const fixtureCounts = {
    employees: await employeeRepo.count(),
    orders: await orderRepo.count(),
    deliveries: await deliveryRepo.count(),
    purchaseOrders: await poRepo.count(),
    transfers: await transferRepo.count(),
    replenishments: await replenishmentRepo.count(),
    bookings: await bookingRepo.count(),
    meetingPreparations: await preparationRepo.count(),
    cleaningTasks: await taskRepo.count(),
    cleaningProducts: await cleaningProductRepo.count(),
    cleaningStockRequests: await cleaningRequestRepo.count(),
    notifications: await notificationRepo.count(),
  };
  logger.log(`Fixture summary: ${JSON.stringify(fixtureCounts)}`);
  logger.log('Operations 2.0 fixtures: modules and workflows ready');
  await app.close();
  // Des handles ouverts (ioredis, socket.io) peuvent maintenir le process
  process.exit(0);
}

main().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
