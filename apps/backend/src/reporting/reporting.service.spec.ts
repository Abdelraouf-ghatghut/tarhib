import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportingService } from './reporting.service.js';
import { Order } from '../orders/entities/order.entity.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { MeetingRoom } from '../meeting-rooms/entities/meeting-room.entity.js';
import { RoomBooking } from '../meeting-rooms/entities/room-booking.entity.js';
import { PurchaseOrderLine } from '../procurement/entities/purchase-order-line.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { OrderLine } from '../orders/entities/order-line.entity.js';
import { Quota } from '../quotas/entities/quota.entity.js';
import { RedisService } from '../redis/redis.service.js';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makeQb = (quotas: Partial<Quota>[]) => ({
  andWhere: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(quotas),
});

describe('ReportingService — getQuotaReport (§3 CLAUDE.md, règle centrale quotas)', () => {
  let service: ReportingService;
  let quotaRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: RedisService,
          // Cache best-effort (PR-1.5) : miss systématique en test, la
          // logique de getQuotaReport ne dépend jamais du cache exécutif.
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: getRepositoryToken(Order), useFactory: mockRepo },
        { provide: getRepositoryToken(InventoryItem), useFactory: mockRepo },
        { provide: getRepositoryToken(MeetingRoom), useFactory: mockRepo },
        { provide: getRepositoryToken(RoomBooking), useFactory: mockRepo },
        {
          provide: getRepositoryToken(PurchaseOrderLine),
          useFactory: mockRepo,
        },
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: getRepositoryToken(Company), useFactory: mockRepo },
        { provide: getRepositoryToken(Branch), useFactory: mockRepo },
        { provide: getRepositoryToken(Employee), useFactory: mockRepo },
        { provide: getRepositoryToken(OrderLine), useFactory: mockRepo },
        { provide: getRepositoryToken(Quota), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(ReportingService);
    quotaRepo = module.get(getRepositoryToken(Quota));
  });

  it('returns zeroed report when no quota exists', async () => {
    quotaRepo.createQueryBuilder.mockReturnValue(makeQb([]));
    const result = await service.getQuotaReport('co-1');
    expect(result).toEqual({
      total: 0,
      averageConsumptionRate: 0,
      nearCapCount: 0,
      byProduct: [],
      nearCapEmployees: [],
    });
  });

  it('computes the average consumption rate and flags quotas at/above 80% as near-cap', async () => {
    quotaRepo.createQueryBuilder.mockReturnValue(
      makeQb([
        {
          employeeId: 'emp-1',
          productId: 'prod-1',
          maxQuantity: 10,
          usedQuantity: 9, // 90% — near cap
          periodEnd: '2026-01-31',
        },
        {
          employeeId: 'emp-2',
          productId: 'prod-1',
          maxQuantity: 10,
          usedQuantity: 1, // 10% — not near cap
          periodEnd: '2026-01-31',
        },
      ]),
    );

    const result = await service.getQuotaReport('co-1');

    expect(result.total).toBe(2);
    expect(result.averageConsumptionRate).toBeCloseTo(0.5, 5);
    expect(result.nearCapCount).toBe(1);
    expect(result.nearCapEmployees).toHaveLength(1);
    expect(result.nearCapEmployees[0].employeeId).toBe('emp-1');
  });

  it('aggregates consumption by product across multiple employees', async () => {
    quotaRepo.createQueryBuilder.mockReturnValue(
      makeQb([
        {
          employeeId: 'emp-1',
          productId: 'prod-coffee',
          maxQuantity: 10,
          usedQuantity: 4,
          periodEnd: '2026-01-31',
        },
        {
          employeeId: 'emp-2',
          productId: 'prod-coffee',
          maxQuantity: 20,
          usedQuantity: 6,
          periodEnd: '2026-01-31',
        },
      ]),
    );

    const result = await service.getQuotaReport('co-1');

    expect(result.byProduct).toEqual([
      {
        productId: 'prod-coffee',
        maxQuantity: 30,
        usedQuantity: 10,
        consumptionRate: 10 / 30,
      },
    ]);
  });

  it('treats a maxQuantity of 0 as 0% consumption instead of dividing by zero', async () => {
    quotaRepo.createQueryBuilder.mockReturnValue(
      makeQb([
        {
          employeeId: 'emp-1',
          productId: 'prod-1',
          maxQuantity: 0,
          usedQuantity: 0,
          periodEnd: '2026-01-31',
        },
      ]),
    );

    const result = await service.getQuotaReport('co-1');
    expect(result.averageConsumptionRate).toBe(0);
    expect(Number.isFinite(result.averageConsumptionRate)).toBe(true);
  });

  it('joins on branch when branchId is provided', async () => {
    const qb = makeQb([]);
    quotaRepo.createQueryBuilder.mockReturnValue(qb);

    await service.getQuotaReport('co-1', { branchId: 'br-1' });

    expect(qb.innerJoin).toHaveBeenCalledWith(
      Employee,
      'e',
      'e.id = q.employee_id',
    );
    expect(qb.andWhere).toHaveBeenCalledWith('e.branch_id = :branchId', {
      branchId: 'br-1',
    });
  });
});

describe('ReportingService — cache du rapport exécutif (PR-1.5)', () => {
  let service: ReportingService;
  let orderRepo: ReturnType<typeof mockRepo>;
  let orderLineRepo: ReturnType<typeof mockRepo>;
  let inventoryRepo: ReturnType<typeof mockRepo>;
  let poLineRepo: ReturnType<typeof mockRepo>;
  let redis: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    redis = { get: jest.fn(), set: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        { provide: RedisService, useValue: redis },
        { provide: getRepositoryToken(Order), useFactory: mockRepo },
        { provide: getRepositoryToken(InventoryItem), useFactory: mockRepo },
        { provide: getRepositoryToken(MeetingRoom), useFactory: mockRepo },
        { provide: getRepositoryToken(RoomBooking), useFactory: mockRepo },
        {
          provide: getRepositoryToken(PurchaseOrderLine),
          useFactory: mockRepo,
        },
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: getRepositoryToken(Company), useFactory: mockRepo },
        { provide: getRepositoryToken(Branch), useFactory: mockRepo },
        { provide: getRepositoryToken(Employee), useFactory: mockRepo },
        { provide: getRepositoryToken(OrderLine), useFactory: mockRepo },
        { provide: getRepositoryToken(Quota), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(ReportingService);
    orderRepo = module.get(getRepositoryToken(Order));
    orderLineRepo = module.get(getRepositoryToken(OrderLine));
    inventoryRepo = module.get(getRepositoryToken(InventoryItem));
    poLineRepo = module.get(getRepositoryToken(PurchaseOrderLine));
    for (const token of [Company, Branch, Employee]) {
      const repo: { count: jest.Mock } = module.get(getRepositoryToken(token));
      repo.count = jest.fn().mockResolvedValue(0);
    }
  });

  it('returns the cached report on a hit without querying the database', async () => {
    const cached = { kpis: { ordersCount: 42 } };
    redis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await service.getExecutiveReport({ companyId: 'co-1' });

    expect(result).toEqual(cached);
    expect(orderRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('falls back to computing the report when Redis is unavailable (best-effort)', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ avgMinutes: null }),
    };
    orderRepo.createQueryBuilder.mockReturnValue(qb);
    orderLineRepo.createQueryBuilder.mockReturnValue(qb);
    inventoryRepo.createQueryBuilder.mockReturnValue(qb);
    poLineRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getExecutiveReport({ companyId: 'co-1' });

    expect(orderRepo.createQueryBuilder).toHaveBeenCalled();
    expect(result.kpis.ordersCount).toBe(0);
    // Écriture cache tentée malgré le miss initial en lecture (best-effort,
    // jamais bloquant).
    expect(redis.set).toHaveBeenCalled();
  });
});
