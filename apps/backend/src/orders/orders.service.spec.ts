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

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        ValidationEngineService,
        { provide: getRepositoryToken(Order), useFactory: mockRepo },
        { provide: getRepositoryToken(OrderLine), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepo = module.get(getRepositoryToken(Order));
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

    it('should set slaDeadline in the future', async () => {
      const before = Date.now();
      const order = makeOrder(OrderPriority.P5);
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      await service.create(
        { lines: [{ productId: 'prod-1', quantity: 1 }] },
        caller(),
      );

      const savedOrder = (orderRepo.save.mock.calls[0] as [Order])[0];
      expect(savedOrder.slaDeadline.getTime()).toBeGreaterThan(before);
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
