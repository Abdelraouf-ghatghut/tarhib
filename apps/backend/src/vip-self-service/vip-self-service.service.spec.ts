import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { VipSelfServiceService } from './vip-self-service.service.js';
import { VipReplenishmentTask } from './entities/vip-replenishment-task.entity.js';
import { VipLocation } from './entities/vip-location.entity.js';
import { VipLocationProduct } from './entities/vip-location-product.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductType } from '../products/dto/product.dto.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { StockZone } from '../inventory/entities/inventory-item.entity.js';

const mockRepo = () => ({
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => Promise.resolve(v)),
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  remove: jest.fn(),
});

const vipProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 'prod-vip',
    nameAr: 'قهوة VIP',
    nameEn: 'VIP Coffee',
    type: ProductType.LIBRE_SERVICE_VIP,
    isVipSelfService: true,
    active: true,
    ...overrides,
  }) as Product;

describe('VipSelfServiceService', () => {
  let service: VipSelfServiceService;
  let taskRepo: ReturnType<typeof mockRepo>;
  let locationRepo: ReturnType<typeof mockRepo>;
  let locationProductRepo: ReturnType<typeof mockRepo>;
  let productRepo: ReturnType<typeof mockRepo>;
  let inventoryService: { decrementBranchStock: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VipSelfServiceService,
        {
          provide: getRepositoryToken(VipReplenishmentTask),
          useFactory: mockRepo,
        },
        { provide: getRepositoryToken(VipLocation), useFactory: mockRepo },
        {
          provide: getRepositoryToken(VipLocationProduct),
          useFactory: mockRepo,
        },
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        {
          provide: InventoryService,
          useValue: {
            decrementBranchStock: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(VipSelfServiceService);
    taskRepo = module.get(getRepositoryToken(VipReplenishmentTask));
    locationRepo = module.get(getRepositoryToken(VipLocation));
    locationProductRepo = module.get(getRepositoryToken(VipLocationProduct));
    productRepo = module.get(getRepositoryToken(Product));
    inventoryService = module.get(InventoryService);
  });

  describe('createLocation', () => {
    it('creates a VIP location scoped to a department and an employee, with its initial product', async () => {
      productRepo.find.mockResolvedValue([vipProduct()]);
      locationRepo.save.mockImplementation((v: unknown) =>
        Promise.resolve({ id: 'loc-1', ...(v as object) }),
      );

      const [result] = await service.createLocation({
        companyId: 'co-1',
        branchId: 'br-1',
        departmentId: 'dept-1',
        assignedEmployeeId: 'emp-1',
        locationName: 'Frigo — Bureau CFO',
        products: [
          {
            productId: 'prod-vip',
            quantity: 10,
            minThreshold: 2,
            maxThreshold: 10,
          },
        ],
      });

      expect(locationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: 'dept-1',
          assignedEmployeeId: 'emp-1',
        }),
      );
      expect(result.departmentId).toBe('dept-1');
      expect(result.assignedEmployeeId).toBe('emp-1');
      expect(result.productNameAr).toBe('قهوة VIP');
    });

    it('rejects a product that is not LIBRE_SERVICE_VIP', async () => {
      productRepo.find.mockResolvedValue([
        vipProduct({
          id: 'prod-commandable',
          type: ProductType.COMMANDABLE,
          isVipSelfService: false,
        }),
      ]);

      await expect(
        service.createLocation({
          companyId: 'co-1',
          branchId: 'br-1',
          products: [{ productId: 'prod-commandable', quantity: 5 }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(locationRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown product', async () => {
      productRepo.find.mockResolvedValue([]);
      await expect(
        service.createLocation({
          companyId: 'co-1',
          branchId: 'br-1',
          products: [{ productId: 'unknown', quantity: 5 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLocations', () => {
    it('filters by departmentId when provided', async () => {
      locationRepo.find.mockResolvedValue([]);

      await service.getLocations('co-1', undefined, 'dept-1');

      expect(locationRepo.find).toHaveBeenCalledWith({
        where: { companyId: 'co-1', departmentId: 'dept-1' },
      });
    });

    it('returns [] when no VIP location exists', async () => {
      locationRepo.find.mockResolvedValue([]);
      const result = await service.getLocations();
      expect(result).toEqual([]);
    });
  });

  describe('completeTask', () => {
    it('rejects completing an already-completed task', async () => {
      taskRepo.findOne.mockResolvedValue({ id: 't-1', status: 'COMPLETED' });
      await expect(service.completeTask('t-1', 'emp-1', [])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('defaults to KITCHEN and decrements it when no zone is requested', async () => {
      taskRepo.findOne.mockResolvedValue({ id: 't-1', status: 'OPEN' });
      taskRepo.save.mockImplementation((v: unknown) => Promise.resolve(v));
      locationProductRepo.findOne.mockResolvedValue({
        id: 'lp-1',
        vipLocationId: 'loc-1',
        productId: 'prod-vip',
        quantity: 2,
        minThreshold: 2,
        maxThreshold: 10,
      });
      locationProductRepo.save.mockImplementation((v: unknown) =>
        Promise.resolve(v),
      );
      locationRepo.findOne.mockResolvedValue({
        id: 'loc-1',
        branchId: 'br-1',
        companyId: 'co-1',
      });

      // Permissions kitchen-only : KITCHEN doit rester accessible par défaut.
      await service.completeTask('t-1', 'emp-1', ['stock.kitchen.view']);

      expect(inventoryService.decrementBranchStock).toHaveBeenCalledWith(
        'prod-vip',
        'br-1',
        'co-1',
        8,
        StockZone.KITCHEN,
      );
    });

    it('allows BRANCH when the caller has stock.view', async () => {
      taskRepo.findOne.mockResolvedValue({ id: 't-1', status: 'OPEN' });
      taskRepo.save.mockImplementation((v: unknown) => Promise.resolve(v));
      locationProductRepo.findOne.mockResolvedValue({
        id: 'lp-1',
        vipLocationId: 'loc-1',
        productId: 'prod-vip',
        quantity: 2,
        minThreshold: 2,
        maxThreshold: 10,
      });
      locationProductRepo.save.mockImplementation((v: unknown) =>
        Promise.resolve(v),
      );
      locationRepo.findOne.mockResolvedValue({
        id: 'loc-1',
        branchId: 'br-1',
        companyId: 'co-1',
      });

      await service.completeTask(
        't-1',
        'emp-1',
        ['stock.view'],
        StockZone.BRANCH,
      );

      expect(inventoryService.decrementBranchStock).toHaveBeenCalledWith(
        'prod-vip',
        'br-1',
        'co-1',
        8,
        StockZone.BRANCH,
      );
    });

    it('rejects BRANCH for a caller with kitchen-only access', async () => {
      taskRepo.findOne.mockResolvedValue({ id: 't-1', status: 'OPEN' });
      await expect(
        service.completeTask(
          't-1',
          'emp-1',
          ['stock.kitchen.view'],
          StockZone.BRANCH,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('always rejects CENTRAL — requires a physical transfer to BRANCH first', async () => {
      await expect(
        service.completeTask(
          't-1',
          'emp-1',
          ['stock.manage', 'inventory.manage'],
          StockZone.CENTRAL,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(inventoryService.decrementBranchStock).not.toHaveBeenCalled();
    });
  });

  describe('adjustProduct', () => {
    it('creates a replenishment task when quantity drops to/below minThreshold', async () => {
      const item = {
        id: 'lp-1',
        vipLocationId: 'loc-1',
        productId: 'prod-vip',
        quantity: 5,
        minThreshold: 2,
        maxThreshold: 10,
      };
      locationProductRepo.findOne.mockResolvedValue(item);
      locationProductRepo.save.mockImplementation((v: unknown) =>
        Promise.resolve(v),
      );
      locationRepo.findOne.mockResolvedValue({
        id: 'loc-1',
        branchId: 'br-1',
        companyId: 'co-1',
        locationName: null,
      });
      taskRepo.findOne.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue(vipProduct());

      await service.adjustProduct('lp-1', { quantity: 1 });

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ vipLocationProductId: 'lp-1' }),
      );
    });
  });
});
