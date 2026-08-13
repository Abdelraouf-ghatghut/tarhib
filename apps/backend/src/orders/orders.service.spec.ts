import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { OrdersService } from './orders.service.js';
import { Order } from './entities/order.entity.js';
import { OrderLine } from './entities/order-line.entity.js';
import { ValidationEngineService } from './validation-engine/validation-engine.service.js';
import { OrderPriority, OrderStatus } from './dto/order.dto.js';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { EmployeeRole } from '../employees/dto/employee.dto.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductRecipeLine } from '../products/entities/product-recipe-line.entity.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { Quota } from '../quotas/entities/quota.entity.js';
import { QuotasService } from '../quotas/quotas.service.js';
import { RoleQuota } from '../roles/entities/role-quota.entity.js';
import { EmployeeQuotaUsage } from '../roles/entities/employee-quota-usage.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';
import {
  PrioritySlaService,
  DEFAULT_SLA_MINUTES,
} from '../priority-sla/priority-sla.service.js';
import { Role, SlaPriority } from '../roles/entities/role.entity.js';
import { computeOrderRequestHash } from './order-request-hash.js';

const mockRepo = () => ({
  create: jest.fn((v: unknown) => v),
  save: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const caller = (role: EmployeeRole = EmployeeRole.EMPLOYEE): JwtPayload => ({
  sub: 'emp-1',
  email: 'e@co.com',
  role,
  companyId: 'co-1',
  branchId: 'br-1',
  permissions: [],
});

const makeOrder = (priority: OrderPriority): Order => ({
  id: 'ord-1',
  orderNumber: 1,
  employeeId: 'emp-1',
  companyId: 'co-1',
  branchId: 'br-1',
  status: OrderStatus.PENDING,
  priority,
  slaDeadline: new Date(),
  note: null,
  createdAt: new Date(),
  approvedAt: null,
  approvedBy: null,
  rejectedAt: null,
  rejectedBy: null,
  prepStartedAt: null,
  preparedBy: null,
  readyAt: null,
  readyBy: null,
  deliveredAt: null,
  deliveredBy: null,
  clientRequestId: null,
  clientRequestHash: null,
  lines: [],
});

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: ReturnType<typeof mockRepo>;
  let lineRepo: ReturnType<typeof mockRepo>;
  let productRepo: ReturnType<typeof mockRepo>;
  let roleQuotaRepo: ReturnType<typeof mockRepo>;
  let inventoryService: { decrementForPreparation: jest.Mock };
  let prioritySla: { getSlaMinutes: jest.Mock };

  beforeEach(async () => {
    prioritySla = {
      getSlaMinutes: jest
        .fn()
        .mockImplementation((_companyId: string, code: SlaPriority) =>
          Promise.resolve(DEFAULT_SLA_MINUTES[code]),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        // Vraie instance : snapshotsFor s'appuie sur les mocks de repos
        // Quota/RoleQuota/EmployeeQuotaUsage fournis ci-dessous — le moteur
        // de validation est ainsi testé avec la logique quotas réelle.
        QuotasService,
        ValidationEngineService,
        { provide: getRepositoryToken(Order), useFactory: mockRepo },
        { provide: getRepositoryToken(OrderLine), useFactory: mockRepo },
        { provide: getRepositoryToken(Employee), useFactory: mockRepo },
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: getRepositoryToken(InventoryItem), useFactory: mockRepo },
        { provide: getRepositoryToken(Quota), useFactory: mockRepo },
        { provide: getRepositoryToken(RoleQuota), useFactory: mockRepo },
        {
          provide: getRepositoryToken(EmployeeQuotaUsage),
          useFactory: mockRepo,
        },
        { provide: getRepositoryToken(Role), useFactory: mockRepo },
        {
          provide: getRepositoryToken(ProductRecipeLine),
          useFactory: mockRepo,
        },
        {
          provide: InventoryService,
          useValue: {
            decrementForPreparation: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            notifyOrderStatusChanged: jest.fn(),
            sendPush: jest.fn(),
          },
        },
        {
          provide: NotificationsGateway,
          useValue: { emitOrderUpdate: jest.fn(), emitNewOrder: jest.fn() },
        },
        { provide: PrioritySlaService, useValue: prioritySla },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepo = module.get(getRepositoryToken(Order));
    lineRepo = module.get(getRepositoryToken(OrderLine));
    productRepo = module.get(getRepositoryToken(Product));
    roleQuotaRepo = module.get(getRepositoryToken(RoleQuota));
    inventoryService = module.get(InventoryService);

    // Panier valide par défaut : produit commandable + stock suffisant
    productRepo.find.mockResolvedValue([
      {
        id: 'prod-1',
        isSold: true,
        allowedRoles: null,
        active: true,
      },
    ]);
    const inventoryRepo: ReturnType<typeof mockRepo> = module.get(
      getRepositoryToken(InventoryItem),
    );
    inventoryRepo.find.mockResolvedValue([
      { productId: 'prod-1', branchId: 'br-1', quantity: 100 },
    ]);
    // Pas de quotas rôle configurés → fallback legacy vide
    roleQuotaRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
    const quotaRepo: ReturnType<typeof mockRepo> = module.get(
      getRepositoryToken(Quota),
    );
    quotaRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
    // updateStatus() résout l'employé pour la notif SMS fire-and-forget —
    // sans ce mock, .findOne(...).then(...) lève sur `undefined`.
    const employeeRepo: ReturnType<typeof mockRepo> = module.get(
      getRepositoryToken(Employee),
    );
    employeeRepo.findOne.mockResolvedValue(null);

    // orderRepo.manager.transaction(...) est utilisé par create() et
    // updateStatus() — le mock exécute simplement le callback avec un faux
    // manager qui route vers les repos mockés existants.
    const quotaUsageRepo: ReturnType<typeof mockRepo> = module.get(
      getRepositoryToken(EmployeeQuotaUsage),
    );
    const fakeManager = {
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb(fakeManager)),
      // Incrément atomique du compteur de numéro de commande par société
      // (cf. create()) — le mock retourne juste un numéro fixe.
      query: jest.fn().mockResolvedValue([{ assigned: 1 }]),
      save: jest.fn((_entity: unknown, value: unknown): unknown =>
        orderRepo.save(value),
      ),
      getRepository: jest.fn((entity: unknown) => {
        if (entity === EmployeeQuotaUsage) return quotaUsageRepo;
        if (entity === Quota) return quotaRepo;
        return mockRepo();
      }),
      // updateStatus() verrouille la commande via un QueryBuilder — le stub
      // chaîne where/setLock et résout getOne() sur le mock orderRepo.findOne.
      createQueryBuilder: jest.fn(() => {
        const qb: Record<string, jest.Mock> = {};
        qb.where = jest.fn(() => qb);
        qb.setLock = jest.fn(() => qb);
        qb.getOne = jest.fn(
          async (): Promise<Order | null> =>
            (await orderRepo.findOne()) as Order | null,
        );
        return qb;
      }),
    };
    (orderRepo as unknown as { manager: unknown }).manager = fakeManager;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should compute priority P5 for EMPLOYEE role', async () => {
      const order = makeOrder(OrderPriority.P5);
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      const result = await service.create(
        { lines: [{ productId: 'prod-1', quantity: 1 }] },
        caller(EmployeeRole.EMPLOYEE),
      );
      expect(result.priority).toBe(OrderPriority.P5);
    });

    it('should keep technical default priority for ADMIN role', async () => {
      const order = makeOrder(OrderPriority.P5);
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      const result = await service.create(
        { lines: [{ productId: 'prod-1', quantity: 1 }] },
        caller(EmployeeRole.ADMIN),
      );
      expect(result.priority).toBe(OrderPriority.P5);
    });

    it('should ignore any legacy slaPriority value on the JWT', async () => {
      const order = makeOrder(OrderPriority.P5);
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      const jwtCaller = { ...caller(), slaPriority: 'P2' } as JwtPayload & {
        slaPriority: string;
      };
      const result = await service.create(
        { lines: [{ productId: 'prod-1', quantity: 1 }] },
        jwtCaller,
      );
      expect(result.priority).toBe(OrderPriority.P5);
      expect(prioritySla.getSlaMinutes).toHaveBeenCalledWith('co-1', 'P5');
    });

    it('should set slaDeadline in the future using default minutes', async () => {
      const before = Date.now();
      const order = makeOrder(OrderPriority.P5);
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      await service.create(
        { lines: [{ productId: 'prod-1', quantity: 1 }] },
        caller(),
      );

      const created = (orderRepo.create.mock.calls[0] as [Order])[0];
      expect(created.slaDeadline.getTime()).toBeGreaterThan(before);
    });

    it('should persist the trimmed employee note (CDC §7 — commentaire libre)', async () => {
      const order = makeOrder(OrderPriority.P5);
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      await service.create(
        {
          lines: [{ productId: 'prod-1', quantity: 1 }],
          note: '  بدون سكر من فضلك  ',
        },
        caller(),
      );

      const created = (orderRepo.create.mock.calls[0] as [Order])[0];
      expect(created.note).toBe('بدون سكر من فضلك');
    });

    it('should store null when the note is blank', async () => {
      const order = makeOrder(OrderPriority.P5);
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      await service.create(
        { lines: [{ productId: 'prod-1', quantity: 1 }], note: '   ' },
        caller(),
      );

      const created = (orderRepo.create.mock.calls[0] as [Order])[0];
      expect(created.note).toBeNull();
    });

    it('should honour company-specific SLA minutes (custom levels)', async () => {
      // L'entreprise a personnalisé P5 à 5 minutes au lieu de 60
      prioritySla.getSlaMinutes.mockResolvedValue(5);
      const order = makeOrder(OrderPriority.P5);
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      const before = Date.now();
      await service.create(
        { lines: [{ productId: 'prod-1', quantity: 1 }] },
        caller(),
      );

      const created = (orderRepo.create.mock.calls[0] as [Order])[0];
      const deltaMinutes = (created.slaDeadline.getTime() - before) / 60_000;
      expect(deltaMinutes).toBeGreaterThan(4);
      expect(deltaMinutes).toBeLessThan(6);
      expect(prioritySla.getSlaMinutes).toHaveBeenCalledWith('co-1', 'P5');
    });
  });

  describe('findMine', () => {
    it('forces the employeeId filter to the caller — never trusts the client', async () => {
      orderRepo.find.mockResolvedValue([]);
      await service.findMine(caller(), OrderStatus.DELIVERED);
      expect(orderRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { employeeId: 'emp-1', status: OrderStatus.DELIVERED },
        }),
      );
    });
  });

  describe('dashboardStats — agrégation SQL (PR-1.4)', () => {
    // Un seul faux QueryBuilder chaînable, réutilisé pour les 3 requêtes
    // d'agrégation (status counts, moyenne SLA, top produits).
    const fakeQb = (resolved: unknown) => {
      const qb: Record<string, jest.Mock> = {};
      qb.select = jest.fn(() => qb);
      qb.addSelect = jest.fn(() => qb);
      qb.innerJoin = jest.fn(() => qb);
      qb.where = jest.fn(() => qb);
      qb.andWhere = jest.fn(() => qb);
      qb.groupBy = jest.fn(() => qb);
      qb.orderBy = jest.fn(() => qb);
      qb.limit = jest.fn(() => qb);
      qb.getRawMany = jest.fn().mockResolvedValue(resolved);
      qb.getRawOne = jest.fn().mockResolvedValue(resolved);
      return qb;
    };

    it('computes counts/avg/top-products from SQL aggregation results, never loading full orders', async () => {
      orderRepo.createQueryBuilder
        .mockReturnValueOnce(
          fakeQb([
            { status: OrderStatus.PENDING, count: '2' },
            { status: OrderStatus.APPROVED, count: '1' },
            { status: OrderStatus.DELIVERED, count: '3' },
          ]),
        )
        .mockReturnValueOnce(fakeQb({ avg: '15.5' }));
      lineRepo.createQueryBuilder.mockReturnValue(
        fakeQb([{ productId: 'prod-1', total: '7' }]),
      );
      productRepo.find.mockResolvedValue([
        { id: 'prod-1', nameEn: 'Coffee', nameAr: 'قهوة' },
      ]);

      const result = await service.dashboardStats(caller());

      expect(result.todayOrders).toBe(6);
      expect(result.pendingCount).toBe(3); // PENDING + APPROVED
      expect(result.deliveredToday).toBe(3);
      expect(result.avgSlaMinutes).toBe(15.5);
      expect(result.mostOrdered).toEqual([
        { productId: 'prod-1', name: 'Coffee', count: 7 },
      ]);
      expect(orderRepo.find).not.toHaveBeenCalled();
    });

    it('returns zero avg when no order was ever delivered today', async () => {
      orderRepo.createQueryBuilder
        .mockReturnValueOnce(fakeQb([]))
        .mockReturnValueOnce(fakeQb({ avg: null }));
      lineRepo.createQueryBuilder.mockReturnValue(fakeQb([]));

      const result = await service.dashboardStats(caller());

      expect(result.avgSlaMinutes).toBe(0);
      expect(result.mostOrdered).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return the order when found', async () => {
      const order = makeOrder(OrderPriority.P5);
      orderRepo.findOne.mockResolvedValue(order);
      const result = await service.findOne('ord-1');
      expect(result.id).toBe('ord-1');
    });

    it('exposes note and line validation details in the DTO', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.note = 'بدون سكر';
      order.lines = [
        {
          id: 'line-1',
          orderId: 'ord-1',
          order: order,
          productId: 'prod-2',
          quantity: 3,
          validationStatus: 'REJECTED',
          rejectionReason: 'INSUFFICIENT_STOCK',
        } as unknown as OrderLine,
      ];
      orderRepo.findOne.mockResolvedValue(order);

      const result = await service.findOne('ord-1');
      expect(result.note).toBe('بدون سكر');
      expect(result.lines).toEqual([
        {
          id: 'line-1',
          productId: 'prod-2',
          quantity: 3,
          validationStatus: 'REJECTED',
          rejectionReason: 'INSUFFICIENT_STOCK',
          preparationStatus: 'PENDING',
          preparationNote: null,
        },
      ]);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create — idempotence (D8, PR-0.4)', () => {
    const KEY = '99999999-9999-9999-9999-999999999999';

    it('stores clientRequestId/clientRequestHash on a first-time creation', async () => {
      const order = makeOrder(OrderPriority.P5);
      orderRepo.findOne.mockResolvedValue(null); // aucune commande existante pour cette clé
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      await service.create(
        { lines: [{ productId: 'prod-1', quantity: 1 }], clientRequestId: KEY },
        caller(),
      );

      const created = (orderRepo.create.mock.calls[0] as [Order])[0];
      expect(created.clientRequestId).toBe(KEY);
      expect(created.clientRequestHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns the existing order without recreating when the same key+payload is retried', async () => {
      const existing = makeOrder(OrderPriority.P5);
      existing.id = 'ord-existing';
      existing.clientRequestId = KEY;
      existing.clientRequestHash = computeOrderRequestHash(
        [{ productId: 'prod-1', quantity: 1 }],
        null,
      );
      orderRepo.findOne.mockResolvedValue(existing);

      const result = await service.create(
        { lines: [{ productId: 'prod-1', quantity: 1 }], clientRequestId: KEY },
        caller(),
      );

      expect(result.id).toBe('ord-existing');
      expect(orderRepo.create).not.toHaveBeenCalled();
      expect(orderRepo.save).not.toHaveBeenCalled();
    });

    it('rejects with 409 when the same key is reused with a different payload', async () => {
      const existing = makeOrder(OrderPriority.P5);
      existing.clientRequestId = KEY;
      existing.clientRequestHash = computeOrderRequestHash(
        [{ productId: 'prod-1', quantity: 1 }],
        null,
      );
      orderRepo.findOne.mockResolvedValue(existing);

      await expect(
        service.create(
          {
            lines: [{ productId: 'prod-1', quantity: 5 }], // quantité différente
            clientRequestId: KEY,
          },
          caller(),
        ),
      ).rejects.toThrow(ConflictException);
      expect(orderRepo.create).not.toHaveBeenCalled();
    });

    it('resolves the concurrent-retry race: unique-index violation → returns the winning order', async () => {
      const winner = makeOrder(OrderPriority.P5);
      winner.id = 'ord-winner';
      winner.clientRequestId = KEY;
      winner.clientRequestHash = computeOrderRequestHash(
        [{ productId: 'prod-1', quantity: 1 }],
        null,
      );

      // Pre-check : aucune commande encore visible (course avec le gagnant).
      // Après l'échec de l'INSERT (violation d'index), le refetch la trouve.
      orderRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winner);
      orderRepo.create.mockReturnValue(makeOrder(OrderPriority.P5));
      orderRepo.save.mockRejectedValue(
        new QueryFailedError(
          'INSERT INTO orders ...',
          [],
          Object.assign(new Error('duplicate key'), {
            code: '23505',
            constraint: 'uq_orders_employee_client_request',
          }),
        ),
      );

      const result = await service.create(
        { lines: [{ productId: 'prod-1', quantity: 1 }], clientRequestId: KEY },
        caller(),
      );

      expect(result.id).toBe('ord-winner');
    });

    it('propagates a genuine unique-violation unrelated to idempotence', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      orderRepo.create.mockReturnValue(makeOrder(OrderPriority.P5));
      orderRepo.save.mockRejectedValue(
        new QueryFailedError(
          'INSERT INTO orders ...',
          [],
          Object.assign(new Error('duplicate key'), {
            code: '23505',
            constraint: 'uq_orders_company_order_number', // AUTRE contrainte
          }),
        ),
      );

      await expect(
        service.create(
          {
            lines: [{ productId: 'prod-1', quantity: 1 }],
            clientRequestId: KEY,
          },
          caller(),
        ),
      ).rejects.toThrow(QueryFailedError);
    });
  });

  describe('create — automatic validation-engine decision (CLAUDE.md §3.3)', () => {
    it('auto-approves the order when every line passes role+stock+quota (no quota configured)', async () => {
      const order = makeOrder(OrderPriority.P5);
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      await service.create(
        { lines: [{ productId: 'prod-1', quantity: 1 }] },
        caller(),
      );

      const created = (orderRepo.create.mock.calls[0] as [Order])[0];
      expect(created.status).toBe(OrderStatus.APPROVED);
      expect(created.approvedAt).toBeInstanceOf(Date);
    });

    it('still auto-approves the order when only one line is rejected — no manager arbitration', async () => {
      // 2 produits : 1 valide, 1 sans stock suffisant → la ligne fautive est
      // rejetée automatiquement (rejectionReason renseigné) mais ça ne bloque
      // pas le reste du panier ni n'attend un Department Manager (correction
      // métier : la commande est validée dès qu'il reste ≥1 ligne valide).
      // prod-2 n'a volontairement aucune entrée de stock dans le mock par
      // défaut (seul prod-1 en a) → rejeté pour INSUFFICIENT_STOCK.
      productRepo.find.mockResolvedValue([
        { id: 'prod-1', isSold: true, allowedRoles: null, active: true },
        { id: 'prod-2', isSold: true, allowedRoles: null, active: true },
      ]);

      const order = makeOrder(OrderPriority.P5);
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      await service.create(
        {
          lines: [
            { productId: 'prod-1', quantity: 1 },
            { productId: 'prod-2', quantity: 999 },
          ],
        },
        caller(),
      );

      const created = (orderRepo.create.mock.calls[0] as [Order])[0];
      expect(created.status).toBe(OrderStatus.APPROVED);
      expect(created.approvedAt).toBeInstanceOf(Date);
      const rejectedLine = created.lines.find((l) => l.productId === 'prod-2')!;
      expect(rejectedLine.validationStatus).toBe('REJECTED');
      expect(rejectedLine.rejectionReason).toBe('INSUFFICIENT_STOCK');
    });

    it('refuses the whole order when every line is rejected', async () => {
      productRepo.find.mockResolvedValue([
        { id: 'prod-1', isSold: true, allowedRoles: null, active: true },
      ]);

      await expect(
        service.create(
          { lines: [{ productId: 'prod-1', quantity: 999 }] },
          caller(),
        ),
      ).rejects.toThrow('orderValidationFailed');
      expect(orderRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus — multi-tenant access', () => {
    const platformAdmin: JwtPayload = {
      sub: 'admin-1',
      email: 'super@tarhib.app',
      role: 'ADMIN',
      // Un admin plateforme n'a aucune société assignée en base — le champ
      // reste typé `string` par legacy mais vaut bien null/undefined au runtime.
      companyId: null as unknown as string,
      branchId: undefined,
      permissions: ['company.manage'],
    };

    it('lets a platform admin transition an order belonging to any company', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.companyId = 'co-OTHER';
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockImplementation((o: Order) => Promise.resolve(o));

      const result = await service.updateStatus(
        'ord-1',
        OrderStatus.APPROVED,
        platformAdmin,
      );
      expect(result.status).toBe(OrderStatus.APPROVED);
    });

    it("still rejects a non-admin caller acting on another company's order", async () => {
      const order = makeOrder(OrderPriority.P5);
      order.companyId = 'co-OTHER';
      orderRepo.findOne.mockResolvedValue(order);

      const manager: JwtPayload = {
        ...caller(EmployeeRole.DEPARTMENT_MANAGER),
        permissions: ['order.approve'],
      };

      await expect(
        service.updateStatus('ord-1', OrderStatus.APPROVED, manager),
      ).rejects.toThrow('crossTenantAccessDenied');
    });
  });

  describe('updateStatus — réservations de stock (D1=B)', () => {
    const platformAdmin: JwtPayload = {
      sub: 'admin-1',
      email: 'super@tarhib.app',
      role: 'ADMIN',
      companyId: null as unknown as string,
      branchId: undefined,
      permissions: ['company.manage'],
    };

    // Le stock n'est plus décrémenté à la préparation via decrementForPreparation
    // (obsolète) : il a été RÉSERVÉ à l'approbation, la préparation consomme les
    // réservations. La logique détaillée (consume/release) est couverte par les
    // tests d'intégration (concurrency.int-spec.ts).
    it('IN_PROGRESS transitionne sans decrementForPreparation (réservations consommées)', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.status = OrderStatus.APPROVED;
      order.lines = [];
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockImplementation((o: Order) => Promise.resolve(o));

      const result = await service.updateStatus(
        'ord-1',
        OrderStatus.IN_PROGRESS,
        platformAdmin,
      );

      expect(result.status).toBe(OrderStatus.IN_PROGRESS);
      expect(inventoryService.decrementForPreparation).not.toHaveBeenCalled();
    });

    it('REJECTED transitionne et libère les réservations', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.status = OrderStatus.APPROVED;
      order.lines = [];
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockImplementation((o: Order) => Promise.resolve(o));

      const result = await service.updateStatus(
        'ord-1',
        OrderStatus.REJECTED,
        platformAdmin,
        'Rupture confirmée par le superviseur',
      );

      expect(result.status).toBe(OrderStatus.REJECTED);
    });

    it('refuse un rejet sans motif', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.status = OrderStatus.APPROVED;
      orderRepo.findOne.mockResolvedValue(order);

      await expect(
        service.updateStatus('ord-1', OrderStatus.REJECTED, platformAdmin),
      ).rejects.toThrow('rejectionReasonRequired');
    });
  });

  describe('updateStatus — annulation par le propriétaire (D13)', () => {
    it('lets the owner cancel their own PENDING order', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.status = OrderStatus.PENDING;
      order.employeeId = 'emp-1'; // === caller().sub
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockImplementation((o: Order) => Promise.resolve(o));

      const result = await service.updateStatus(
        'ord-1',
        OrderStatus.CANCELLED,
        caller(),
      );
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('lets the owner cancel their own APPROVED order', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.status = OrderStatus.APPROVED;
      order.employeeId = 'emp-1';
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockImplementation((o: Order) => Promise.resolve(o));

      const result = await service.updateStatus(
        'ord-1',
        OrderStatus.CANCELLED,
        caller(),
      );
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it("rejects cancellation of someone else's order by a plain employee", async () => {
      const order = makeOrder(OrderPriority.P5);
      order.status = OrderStatus.APPROVED;
      order.employeeId = 'emp-OTHER';
      orderRepo.findOne.mockResolvedValue(order);

      await expect(
        service.updateStatus('ord-1', OrderStatus.CANCELLED, caller()),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects cancellation once the order is IN_PROGRESS (owner or not)', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.status = OrderStatus.IN_PROGRESS;
      order.employeeId = 'emp-1';
      orderRepo.findOne.mockResolvedValue(order);

      await expect(
        service.updateStatus('ord-1', OrderStatus.CANCELLED, caller()),
      ).rejects.toThrow(BadRequestException);
    });

    it('releases reservations and restores quota consumptions on cancellation', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.status = OrderStatus.APPROVED;
      order.employeeId = 'emp-1';
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockImplementation((o: Order) => Promise.resolve(o));

      const fakeManager = (
        orderRepo as unknown as { manager: { query: jest.Mock } }
      ).manager;
      fakeManager.query.mockClear();

      await service.updateStatus('ord-1', OrderStatus.CANCELLED, caller());

      const queries = fakeManager.query.mock.calls.map(
        (call: unknown[]) => call[0] as string,
      );
      expect(queries.some((q) => q.includes("status = 'RELEASED'"))).toBe(true);
      expect(queries.some((q) => q.includes("status = 'RESTORED'"))).toBe(true);
    });
  });
});
