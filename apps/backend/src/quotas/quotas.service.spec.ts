import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { QuotasService } from './quotas.service.js';
import { Quota } from './entities/quota.entity.js';

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotasService,
        { provide: getRepositoryToken(Quota), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<QuotasService>(QuotasService);
    repo = module.get(getRepositoryToken(Quota));
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
});
