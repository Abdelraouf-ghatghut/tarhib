import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { QuotasService } from './quotas.service.js';
import { Quota } from './entities/quota.entity.js';
import { RoleQuota } from '../roles/entities/role-quota.entity.js';
import { EmployeeQuotaUsage } from '../roles/entities/employee-quota-usage.entity.js';

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// Query builder chaînable dont getMany renvoie `rows`.
const mockQb = (rows: unknown[]) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(rows),
});

const baseQuota = (): Quota => ({
  id: 'q-1',
  employeeId: 'emp-1',
  productId: 'prod-1',
  companyId: 'co-1',
  periodStart: '2026-06-01',
  periodEnd: '2026-06-30',
  maxQuantity: 10,
  usedQuantity: 0,
});

describe('QuotasService', () => {
  let service: QuotasService;
  let repo: ReturnType<typeof mockRepo>;
  let roleQuotaRepo: ReturnType<typeof mockRepo>;
  let usageRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotasService,
        { provide: getRepositoryToken(Quota), useFactory: mockRepo },
        { provide: getRepositoryToken(RoleQuota), useFactory: mockRepo },
        {
          provide: getRepositoryToken(EmployeeQuotaUsage),
          useFactory: mockRepo,
        },
      ],
    }).compile();

    service = module.get<QuotasService>(QuotasService);
    repo = module.get(getRepositoryToken(Quota));
    roleQuotaRepo = module.get(getRepositoryToken(RoleQuota));
    usageRepo = module.get(getRepositoryToken(EmployeeQuotaUsage));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a quota with usedQuantity=0', async () => {
      const q = baseQuota();
      repo.create.mockReturnValue(q);
      repo.save.mockResolvedValue(q);

      const result = await service.create({
        employeeId: 'emp-1',
        productId: 'prod-1',
        companyId: 'co-1',
        periodStart: '2026-06-01',
        periodEnd: '2026-06-30',
        maxQuantity: 10,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ usedQuantity: 0 }),
      );
      expect(result.usedQuantity).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return the quota when found', async () => {
      repo.findOne.mockResolvedValue(baseQuota());
      const result = await service.findOne('q-1');
      expect(result.maxQuantity).toBe(10);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates the editable fields and preserves usedQuantity', async () => {
      const q = baseQuota();
      repo.findOne.mockResolvedValue(q);
      repo.save.mockImplementation((v: Quota) => Promise.resolve(v));

      const result = await service.update('q-1', { maxQuantity: 25 });

      expect(result.maxQuantity).toBe(25);
      expect(result.usedQuantity).toBe(0);
    });

    it('throws NotFoundException for unknown id', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.update('unknown', { maxQuantity: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should hard-delete the quota', async () => {
      const q = baseQuota();
      repo.findOne.mockResolvedValue(q);
      repo.remove.mockResolvedValue(q);

      await service.remove('q-1');
      expect(repo.remove).toHaveBeenCalledWith(q);
    });

    it('should throw NotFoundException for unknown id', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should filter by companyId when provided', async () => {
      repo.find.mockResolvedValue([baseQuota()]);
      await service.findAll('co-1');
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 'co-1' } }),
      );
    });
  });

  describe('snapshotsFor — source unique moteur de validation + /mobile/quotas', () => {
    const roleCaller = { sub: 'emp-1', roleId: 'role-1', companyId: 'co-1' };
    const legacyCaller = { sub: 'emp-1', roleId: null, companyId: 'co-1' };

    it('prefers role-based quotas and merges the current period usage', async () => {
      roleQuotaRepo.createQueryBuilder.mockReturnValue(
        mockQb([
          { productId: 'prod-1', maxQuantity: 10 },
          { productId: 'prod-2', maxQuantity: 4 },
        ]),
      );
      usageRepo.createQueryBuilder.mockReturnValue(
        mockQb([{ productId: 'prod-1', usedQuantity: 7 }]),
      );

      const snapshots = await service.snapshotsFor(roleCaller);

      expect(snapshots).toEqual([
        {
          employeeId: 'emp-1',
          productId: 'prod-1',
          maxQuantity: 10,
          usedQuantity: 7,
        },
        {
          employeeId: 'emp-1',
          productId: 'prod-2',
          maxQuantity: 4,
          usedQuantity: 0,
        },
      ]);
      // Sans roleId, le legacy aurait été interrogé — ici non.
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('applies the productIds filter when provided', async () => {
      const rqQb = mockQb([{ productId: 'prod-1', maxQuantity: 10 }]);
      const usageQb = mockQb([]);
      roleQuotaRepo.createQueryBuilder.mockReturnValue(rqQb);
      usageRepo.createQueryBuilder.mockReturnValue(usageQb);

      await service.snapshotsFor(roleCaller, ['prod-1']);

      expect(rqQb.andWhere).toHaveBeenCalledWith(
        'rq.product_id IN (:...productIds)',
        { productIds: ['prod-1'] },
      );
      expect(usageQb.andWhere).toHaveBeenCalledWith(
        'u.product_id IN (:...productIds)',
        { productIds: ['prod-1'] },
      );
    });

    it('falls back to legacy per-employee quotas when the caller has no roleId', async () => {
      repo.createQueryBuilder.mockReturnValue(
        mockQb([
          {
            employeeId: 'emp-1',
            productId: 'prod-9',
            maxQuantity: 3,
            usedQuantity: 1,
          },
        ]),
      );

      const snapshots = await service.snapshotsFor(legacyCaller);

      expect(snapshots).toEqual([
        {
          employeeId: 'emp-1',
          productId: 'prod-9',
          maxQuantity: 3,
          usedQuantity: 1,
        },
      ]);
      expect(roleQuotaRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
