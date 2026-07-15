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
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
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

    // Panier valide par défaut : produit commandable + stock suffisant
    productRepo.find.mockResolvedValue([
      {
        id: 'prod-1',
        type: 'COMMANDABLE',
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
        { id: 'prod-1', type: 'COMMANDABLE', allowedRoles: null, active: true },
        { id: 'prod-2', type: 'COMMANDABLE', allowedRoles: null, active: true },
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
        { id: 'prod-1', type: 'COMMANDABLE', allowedRoles: null, active: true },
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
});
