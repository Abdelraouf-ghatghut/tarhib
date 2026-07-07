/**
 * Seed complet de données réalistes (npm run seed / npm run seed:reset).
 *
 * Tous les ids sont des UUID v4 générés par la base — aucun id codé en dur.
 * Tarhib n'est pas une entreprise du système : le personnel interne est
 * dispatché en mission sur les sites clients (le superadmin reste sans
 * affectation).
 *
 * Contenu : 2 sociétés clientes (branches, départements), niveaux de
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

const logger = new Logger('Seed');
const DEFAULT_PASSWORD = 'Tarhib@2026!';

// ── Référentiel réaliste ─────────────────────────────────────────────────────

const COMPANIES = [
  {
    slug: 'al-aman-bank',
    nameAr: 'بنك الأمان الوطني',
    nameEn: 'Al Aman National Bank',
    branches: [
      {
        nameAr: 'المقر الرئيسي — الجزائر العاصمة',
        nameEn: 'Algiers Headquarters',
        departments: [
          { nameAr: 'الموارد البشرية', nameEn: 'Human Resources' },
          { nameAr: 'المالية', nameEn: 'Finance' },
          { nameAr: 'تقنية المعلومات', nameEn: 'Information Technology' },
        ],
      },
      {
        nameAr: 'فرع وهران',
        nameEn: 'Oran Branch',
        departments: [
          { nameAr: 'خدمة العملاء', nameEn: 'Customer Service' },
          { nameAr: 'العمليات', nameEn: 'Operations' },
        ],
      },
    ],
  },
  {
    slug: 'al-nour-tech',
    nameAr: 'مجموعة النور للتقنية',
    nameEn: 'Al Nour Technology Group',
    branches: [
      {
        nameAr: 'المقر الرئيسي — حيدرة',
        nameEn: 'Hydra Headquarters',
        departments: [
          { nameAr: 'الهندسة', nameEn: 'Engineering' },
          { nameAr: 'التسويق', nameEn: 'Marketing' },
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
  // Boissons chaudes
  {
    nameAr: 'قهوة عربية',
    nameEn: 'Arabic Coffee',
    category: 'Hot Drinks',
    type: ProductType.COMMANDABLE,
    unitCost: 80,
    stock: [45, 15, 80],
  },
  {
    nameAr: 'إسبريسو',
    nameEn: 'Espresso',
    category: 'Hot Drinks',
    type: ProductType.COMMANDABLE,
    unitCost: 100,
    stock: [38, 12, 60],
  },
  {
    nameAr: 'كابتشينو',
    nameEn: 'Cappuccino',
    category: 'Hot Drinks',
    type: ProductType.COMMANDABLE,
    unitCost: 120,
    stock: [30, 10, 50],
  },
  {
    nameAr: 'شاي أخضر بالنعناع',
    nameEn: 'Mint Green Tea',
    category: 'Hot Drinks',
    type: ProductType.COMMANDABLE,
    unitCost: 60,
    stock: [50, 15, 80],
  },
  // Boissons froides
  {
    nameAr: 'ماء معدني',
    nameEn: 'Mineral Water',
    category: 'Cold Drinks',
    type: ProductType.COMMANDABLE,
    unitCost: 30,
    stock: [120, 40, 200],
  },
  {
    nameAr: 'عصير برتقال طازج',
    nameEn: 'Fresh Orange Juice',
    category: 'Cold Drinks',
    type: ProductType.COMMANDABLE,
    unitCost: 150,
    stock: [6, 12, 40],
  }, // sous le seuil → alerte
  // Repas
  {
    nameAr: 'ساندويتش دجاج مشوي',
    nameEn: 'Grilled Chicken Sandwich',
    category: 'Meals',
    type: ProductType.COMMANDABLE,
    unitCost: 450,
    stock: [18, 8, 30],
  },
  {
    nameAr: 'سلطة سيزر',
    nameEn: 'Caesar Salad',
    category: 'Meals',
    type: ProductType.COMMANDABLE,
    unitCost: 380,
    stock: [12, 6, 25],
  },
  // Snacks
  {
    nameAr: 'كرواسون بالزبدة',
    nameEn: 'Butter Croissant',
    category: 'Snacks',
    type: ProductType.COMMANDABLE,
    unitCost: 90,
    stock: [25, 10, 50],
  },
  {
    nameAr: 'كوكيز الشوكولاتة',
    nameEn: 'Chocolate Cookies',
    category: 'Snacks',
    type: ProductType.COMMANDABLE,
    unitCost: 70,
    stock: [0, 10, 40],
  }, // rupture → alerte
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
    nameAr: 'مورد القهوة الذهبية',
    nameEn: 'Golden Coffee Supplies',
    contactName: 'Mourad Zerhouni',
    email: 'contact@golden-coffee.dz',
    phone: '+213661234567',
  },
  {
    nameAr: 'شركة النقاء للمياه والعصائر',
    nameEn: 'Al Naqaa Water & Juices Co',
    contactName: 'Salima Ferhat',
    email: 'sales@alnaqaa.dz',
    phone: '+213770987654',
  },
  {
    nameAr: 'مخبزة الياسمين',
    nameEn: 'Al Yasmine Bakery',
    contactName: 'Hocine Belaid',
    email: 'orders@yasmine-bakery.dz',
    phone: '+213550456789',
  },
];

const MEETING_ROOMS = [
  {
    companySlug: 'al-aman-bank',
    branchEn: 'Algiers Headquarters',
    nameAr: 'قاعة الاجتماعات الكبرى',
    nameEn: 'Grand Meeting Hall',
    capacity: 14,
    amenities: { projector: true, videoConference: true, whiteboard: true },
  },
  {
    companySlug: 'al-aman-bank',
    branchEn: 'Algiers Headquarters',
    nameAr: 'قاعة مجلس الإدارة',
    nameEn: 'Board Room',
    capacity: 8,
    amenities: { videoConference: true, screen: true },
  },
  {
    companySlug: 'al-nour-tech',
    branchEn: 'Hydra Headquarters',
    nameAr: 'قاعة الإبداع',
    nameEn: 'Innovation Room',
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
    let role = await roleRepo.findOne({
      where: { nameEn, scope: RoleScope.CLIENT, companyId: company.id },
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
          permissions: allPermissions.filter((p) =>
            permissionKeys.includes(p.key),
          ),
        }),
      );
      // Pas de cascade sur Role.quotas : insertion directe des lignes
      for (const q of quotas) {
        await roleQuotaRepo.save(
          roleQuotaRepo.create({
            roleId: role.id,
            companyId: company.id,
            productId: productByName.get(q.productEn)!.id,
            periodType: q.periodType,
            maxQuantity: q.maxQuantity,
          }),
        );
      }
      logger.log(
        `Rôle client créé : ${nameEn} (${companySlug}, ${quotas.length} quotas)`,
      );
    }
    return role;
  }

  const employeePerms = [
    'order.create',
    'catalog.view',
    'quota.view',
    'meeting.book',
    'profile.edit',
  ];
  const managerPerms = [
    ...employeePerms,
    'order.approve',
    'meeting.order_services',
    'meeting.manage',
  ];

  const rolesByCompany = new Map<string, { employee: Role; manager: Role }>();
  for (const c of COMPANIES) {
    const employee = await upsertClientRole(
      c.slug,
      'موظف',
      'Employee',
      'P3',
      employeePerms,
      [
        {
          productEn: 'Arabic Coffee',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 3,
        },
        {
          productEn: 'Mineral Water',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 4,
        },
        {
          productEn: 'Grilled Chicken Sandwich',
          periodType: QuotaPeriodType.WEEKLY,
          maxQuantity: 3,
        },
      ],
    );
    const manager = await upsertClientRole(
      c.slug,
      'مدير قسم',
      'Department Manager',
      'P2',
      managerPerms,
      [
        {
          productEn: 'Arabic Coffee',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 5,
        },
        {
          productEn: 'Fresh Orange Juice',
          periodType: QuotaPeriodType.DAILY,
          maxQuantity: 2,
        },
        {
          productEn: 'Caesar Salad',
          periodType: QuotaPeriodType.WEEKLY,
          maxQuantity: 4,
        },
      ],
    );
    rolesByCompany.set(c.slug, { employee, manager });
  }

  async function findTarhibRole(nameEn: string): Promise<Role | null> {
    return roleRepo.findOne({ where: { nameEn, scope: RoleScope.TARHIB } });
  }

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
  }

  async function upsertUser(u: SeedUser): Promise<void> {
    const existing = await employeeRepo.findOne({ where: { email: u.email } });
    if (existing) {
      const changed =
        existing.roleId !== (u.role?.id ?? null) ||
        existing.scope !== u.scope ||
        existing.companyId !== u.companyId ||
        existing.branchId !== u.branchId ||
        existing.departmentId !== u.departmentId;
      if (changed) {
        existing.roleId = u.role?.id ?? null;
        existing.scope = u.scope;
        existing.companyId = u.companyId;
        existing.branchId = u.branchId;
        existing.departmentId = u.departmentId;
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

  const amanHq = branchByKey.get('al-aman-bank|Algiers Headquarters')!;
  const amanOran = branchByKey.get('al-aman-bank|Oran Branch')!;
  const nourHq = branchByKey.get('al-nour-tech|Hydra Headquarters')!;
  const aman = companyBySlug.get('al-aman-bank')!;
  const nour = companyBySlug.get('al-nour-tech')!;
  const dep = (k: string) => departmentByKey.get(k)!;

  // Internes : dispatchés en mission sur les sites clients (فرع, pas de قسم)
  await upsertUser({
    email: 'superadmin@tarhib.app',
    phone: '+213550100001',
    firstNameAr: 'سفيان',
    lastNameAr: 'بن عمر',
    firstNameEn: 'Sofiane',
    lastNameEn: 'Benamar',
    scope: EmployeeScope.TARHIB,
    role: superadminRole,
    companyId: null,
    branchId: null,
    departmentId: null,
  });
  await upsertUser({
    email: 'manager@tarhib.app',
    phone: '+213550100002',
    firstNameAr: 'رياض',
    lastNameAr: 'حداد',
    firstNameEn: 'Riad',
    lastNameEn: 'Haddad',
    scope: EmployeeScope.TARHIB,
    role: await findTarhibRole('Directeur de branche'),
    companyId: aman.id,
    branchId: amanHq.id,
    departmentId: null,
  });
  await upsertUser({
    email: 'chef@tarhib.app',
    phone: '+213550100003',
    firstNameAr: 'كمال',
    lastNameAr: 'بوعزيز',
    firstNameEn: 'Kamel',
    lastNameEn: 'Bouaziz',
    scope: EmployeeScope.TARHIB,
    role: await findTarhibRole('Cuisinier'),
    companyId: aman.id,
    branchId: amanHq.id,
    departmentId: null,
  });
  await upsertUser({
    email: 'livreur@tarhib.app',
    phone: '+213550100004',
    firstNameAr: 'نبيل',
    lastNameAr: 'مرابط',
    firstNameEn: 'Nabil',
    lastNameEn: 'Merabet',
    scope: EmployeeScope.TARHIB,
    role: await findTarhibRole('Livreur'),
    companyId: aman.id,
    branchId: amanHq.id,
    departmentId: null,
  });
  await upsertUser({
    email: 'superviseur@tarhib.app',
    phone: '+213550100005',
    firstNameAr: 'ليلى',
    lastNameAr: 'شريف',
    firstNameEn: 'Leila',
    lastNameEn: 'Cherif',
    scope: EmployeeScope.TARHIB,
    role: await findTarhibRole('Superviseur'),
    companyId: nour.id,
    branchId: nourHq.id,
    departmentId: null,
  });

  // Externes : employés des sociétés clientes (app mobile uniquement)
  await upsertUser({
    email: 'amina.benali@al-aman-bank.dz',
    phone: '+213550200001',
    firstNameAr: 'أمينة',
    lastNameAr: 'بن علي',
    firstNameEn: 'Amina',
    lastNameEn: 'Benali',
    scope: EmployeeScope.CLIENT,
    role: rolesByCompany.get('al-aman-bank')!.employee,
    companyId: aman.id,
    branchId: amanHq.id,
    departmentId: dep('al-aman-bank|Algiers Headquarters|Human Resources').id,
  });
  await upsertUser({
    email: 'khaled.mansouri@al-aman-bank.dz',
    phone: '+213550200002',
    firstNameAr: 'خالد',
    lastNameAr: 'منصوري',
    firstNameEn: 'Khaled',
    lastNameEn: 'Mansouri',
    scope: EmployeeScope.CLIENT,
    role: rolesByCompany.get('al-aman-bank')!.manager,
    companyId: aman.id,
    branchId: amanHq.id,
    departmentId: dep('al-aman-bank|Algiers Headquarters|Finance').id,
  });
  await upsertUser({
    email: 'said.belkacem@al-aman-bank.dz',
    phone: '+213550200003',
    firstNameAr: 'سعيد',
    lastNameAr: 'بلقاسم',
    firstNameEn: 'Said',
    lastNameEn: 'Belkacem',
    scope: EmployeeScope.CLIENT,
    role: rolesByCompany.get('al-aman-bank')!.employee,
    companyId: aman.id,
    branchId: amanOran.id,
    departmentId: dep('al-aman-bank|Oran Branch|Customer Service').id,
  });
  await upsertUser({
    email: 'yousef.taleb@al-nour-tech.dz',
    phone: '+213550200004',
    firstNameAr: 'يوسف',
    lastNameAr: 'طالب',
    firstNameEn: 'Yousef',
    lastNameEn: 'Taleb',
    scope: EmployeeScope.CLIENT,
    role: rolesByCompany.get('al-nour-tech')!.employee,
    companyId: nour.id,
    branchId: nourHq.id,
    departmentId: dep('al-nour-tech|Hydra Headquarters|Engineering').id,
  });

  // ── Commandes de démonstration (pour visualiser le rendu des rapports) ────
  // Uniquement si aucune commande n'existe déjà (idempotent comme le reste :
  // --reset vide la table avant, donc ce bloc s'exécute toujours après reset).
  const orderRepo = ds.getRepository(Order);
  if ((await orderRepo.count()) === 0) {
    const ordersService = app.get(OrdersService);

    const demoEmployees = [
      { email: 'amina.benali@al-aman-bank.dz', slaPriority: 'P3' },
      { email: 'khaled.mansouri@al-aman-bank.dz', slaPriority: 'P2' },
      { email: 'said.belkacem@al-aman-bank.dz', slaPriority: 'P3' },
      { email: 'yousef.taleb@al-nour-tech.dz', slaPriority: 'P3' },
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
    const safeProducts = [
      'Espresso',
      'Cappuccino',
      'Mint Green Tea',
      'Butter Croissant',
    ];
    const varietyProducts = [
      'Arabic Coffee',
      'Fresh Orange Juice',
      'Caesar Salad',
      'Grilled Chicken Sandwich',
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
        slaPriority: demoEmployees.find((d) => d.email === item.email)!
          .slaPriority,
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
      where: { email: 'khaled.mansouri@al-aman-bank.dz' },
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
          productEn: 'Arabic Coffee',
          qty: 20,
          unitCost: 75,
          status: PurchaseOrderStatus.RECEIVED,
        },
        {
          daysAgo: 12,
          supplierIdx: 1,
          productEn: 'Mineral Water',
          qty: 100,
          unitCost: 28,
          status: PurchaseOrderStatus.RECEIVED,
        },
        {
          daysAgo: 9,
          supplierIdx: 2,
          productEn: 'Butter Croissant',
          qty: 40,
          unitCost: 85,
          status: PurchaseOrderStatus.RECEIVED,
        },
        {
          daysAgo: 6,
          supplierIdx: 0,
          productEn: 'Espresso',
          qty: 30,
          unitCost: 95,
          status: PurchaseOrderStatus.SENT,
        },
        {
          daysAgo: 4,
          supplierIdx: 1,
          productEn: 'Fresh Orange Juice',
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
            companyId: aman.id,
            branchId: amanHq.id,
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
  await app.close();
  // Des handles ouverts (ioredis, socket.io) peuvent maintenir le process
  process.exit(0);
}

main().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
