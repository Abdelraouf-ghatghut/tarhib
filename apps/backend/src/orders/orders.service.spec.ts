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
import { RoleQuota } from '../roles/entities/role-quota.entity.js';
import { EmployeeQuotaUsage } from '../roles/entities/employee-quota-usage.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';
import {
  PrioritySlaService,
  DEFAULT_SLA_MINUTES,
} from '../priority-sla/priority-sla.service.js';
import { SlaPriority } from '../roles/entities/role.entity.js';

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
  createdAt: new Date(),
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
        {
          provide: NotificationsService,
          useValue: { notifyOrderStatusChanged: jest.fn() },
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

    it('should compute priority P1 for ADMIN role', async () => {
      const order = makeOrder(OrderPriority.P1);
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      const result = await service.create(
        { lines: [{ productId: 'prod-1', quantity: 1 }] },
        caller(EmployeeRole.ADMIN),
      );
      expect(result.priority).toBe(OrderPriority.P1);
    });

    it("should use the role's slaPriority from the JWT when present", async () => {
      const order = makeOrder(OrderPriority.P2);
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      const jwtCaller = { ...caller(), slaPriority: 'P2' };
      const result = await service.create(
        { lines: [{ productId: 'prod-1', quantity: 1 }] },
        jwtCaller,
      );
      expect(result.priority).toBe(OrderPriority.P2);
      expect(prioritySla.getSlaMinutes).toHaveBeenCalledWith('co-1', 'P2');
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

  describe('findOne', () => {
    it('should return the order when found', async () => {
      const order = makeOrder(OrderPriority.P5);
      orderRepo.findOne.mockResolvedValue(order);
      const result = await service.findOne('ord-1');
      expect(result.id).toBe('ord-1');
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
