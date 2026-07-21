import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
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
  lines: [],
});

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: ReturnType<typeof mockRepo>;
  let productRepo: ReturnType<typeof mockRepo>;
  let roleQuotaRepo: ReturnType<typeof mockRepo>;
  let recipeRepo: ReturnType<typeof mockRepo>;
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
    productRepo = module.get(getRepositoryToken(Product));
    roleQuotaRepo = module.get(getRepositoryToken(RoleQuota));
    recipeRepo = module.get(getRepositoryToken(ProductRecipeLine));
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
    // decrementRecipeIngredients() — le mock exécute simplement le callback
    // avec un faux manager qui route vers les repos mockés existants.
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
          productId: 'prod-2',
          quantity: 3,
          validationStatus: 'REJECTED',
          rejectionReason: 'INSUFFICIENT_STOCK',
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

  describe('updateStatus — nomenclature (recette) au passage IN_PROGRESS', () => {
    const platformAdmin: JwtPayload = {
      sub: 'admin-1',
      email: 'super@tarhib.app',
      role: 'ADMIN',
      companyId: null as unknown as string,
      branchId: undefined,
      permissions: ['company.manage'],
    };

    it('decrements every ingredient of a composed product’s line by recipeQty × orderedQty', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.status = OrderStatus.APPROVED;
      order.lines = [
        {
          id: 'line-1',
          productId: 'prod-latte',
          quantity: 2,
          validationStatus: 'APPROVED',
        } as OrderLine,
      ];
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockImplementation((o: Order) => Promise.resolve(o));
      recipeRepo.find.mockResolvedValue([
        {
          productId: 'prod-latte',
          ingredientProductId: 'ing-coffee',
          quantity: 7,
        },
        {
          productId: 'prod-latte',
          ingredientProductId: 'ing-milk',
          quantity: 100,
        },
      ]);

      await service.updateStatus(
        'ord-1',
        OrderStatus.IN_PROGRESS,
        platformAdmin,
      );

      expect(inventoryService.decrementForPreparation).toHaveBeenCalledWith(
        'ing-coffee',
        order.branchId,
        order.companyId,
        14,
        expect.anything(),
        expect.anything(),
      );
      expect(inventoryService.decrementForPreparation).toHaveBeenCalledWith(
        'ing-milk',
        order.branchId,
        order.companyId,
        200,
        expect.anything(),
        expect.anything(),
      );
    });

    it('blocks the transition (order not saved) when an ingredient is insufficient', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.status = OrderStatus.APPROVED;
      order.lines = [
        {
          id: 'line-1',
          productId: 'prod-latte',
          quantity: 2,
          validationStatus: 'APPROVED',
        } as OrderLine,
      ];
      orderRepo.findOne.mockResolvedValue(order);
      recipeRepo.find.mockResolvedValue([
        {
          productId: 'prod-latte',
          ingredientProductId: 'ing-coffee',
          quantity: 7,
        },
      ]);
      inventoryService.decrementForPreparation.mockRejectedValueOnce(
        new Error('insufficientInventoryStock'),
      );

      await expect(
        service.updateStatus('ord-1', OrderStatus.IN_PROGRESS, platformAdmin),
      ).rejects.toThrow('insufficientInventoryStock');
      expect(orderRepo.save).not.toHaveBeenCalled();
    });

    it('decrements the product’s own stock when the line’s product has no recipe (plain product)', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.status = OrderStatus.APPROVED;
      order.lines = [
        {
          id: 'line-1',
          productId: 'prod-plain',
          quantity: 3,
          validationStatus: 'APPROVED',
        } as OrderLine,
      ];
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockImplementation((o: Order) => Promise.resolve(o));
      recipeRepo.find.mockResolvedValue([]);

      await service.updateStatus(
        'ord-1',
        OrderStatus.IN_PROGRESS,
        platformAdmin,
      );

      expect(inventoryService.decrementForPreparation).toHaveBeenCalledWith(
        'prod-plain',
        order.branchId,
        order.companyId,
        3,
        expect.anything(),
        expect.anything(),
      );
    });

    it('blocks the transition when a plain product’s own stock is insufficient', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.status = OrderStatus.APPROVED;
      order.lines = [
        {
          id: 'line-1',
          productId: 'prod-plain',
          quantity: 99,
          validationStatus: 'APPROVED',
        } as OrderLine,
      ];
      orderRepo.findOne.mockResolvedValue(order);
      recipeRepo.find.mockResolvedValue([]);
      inventoryService.decrementForPreparation.mockRejectedValueOnce(
        new Error('insufficientInventoryStock'),
      );

      await expect(
        service.updateStatus('ord-1', OrderStatus.IN_PROGRESS, platformAdmin),
      ).rejects.toThrow('insufficientInventoryStock');
      expect(orderRepo.save).not.toHaveBeenCalled();
    });

    it('mixes composed and plain products correctly in the same order', async () => {
      const order = makeOrder(OrderPriority.P5);
      order.status = OrderStatus.APPROVED;
      order.lines = [
        {
          id: 'line-1',
          productId: 'prod-latte',
          quantity: 1,
          validationStatus: 'APPROVED',
        } as OrderLine,
        {
          id: 'line-2',
          productId: 'prod-plain',
          quantity: 2,
          validationStatus: 'APPROVED',
        } as OrderLine,
      ];
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockImplementation((o: Order) => Promise.resolve(o));
      recipeRepo.find.mockResolvedValue([
        {
          productId: 'prod-latte',
          ingredientProductId: 'ing-coffee',
          quantity: 7,
        },
      ]);

      await service.updateStatus(
        'ord-1',
        OrderStatus.IN_PROGRESS,
        platformAdmin,
      );

      expect(inventoryService.decrementForPreparation).toHaveBeenCalledWith(
        'ing-coffee',
        order.branchId,
        order.companyId,
        7,
        expect.anything(),
        expect.anything(),
      );
      expect(inventoryService.decrementForPreparation).toHaveBeenCalledWith(
        'prod-plain',
        order.branchId,
        order.companyId,
        2,
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
