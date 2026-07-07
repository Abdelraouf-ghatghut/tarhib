import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { Product } from './entities/product.entity.js';
import { ProductSupplierPrice } from './entities/product-supplier-price.entity.js';
import { ProductType } from './dto/product.dto.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { Supplier } from '../suppliers/entities/supplier.entity.js';

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 'prod-1',
    nameAr: 'قهوة',
    nameEn: 'Coffee',
    category: 'beverages',
    type: ProductType.COMMANDABLE,
    allowedRoles: null,
    imageUrl: null,
    active: true,
    ...overrides,
  }) as Product;

const makeQb = (results: Product[]) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(results),
});

describe('ProductsService', () => {
  let service: ProductsService;
  let repo: ReturnType<typeof mockRepo>;
  let inventoryRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: getRepositoryToken(InventoryItem), useFactory: mockRepo },
        {
          provide: getRepositoryToken(ProductSupplierPrice),
          useFactory: mockRepo,
        },
        { provide: getRepositoryToken(Supplier), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repo = module.get(getRepositoryToken(Product));
    inventoryRepo = module.get(getRepositoryToken(InventoryItem));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAvailability — additif, ne touche pas findAll/isAdmin', () => {
    it('returns [] when the caller has no company/branch (internal, unassigned)', async () => {
      const result = await service.findAvailability(undefined, undefined);
      expect(result).toEqual([]);
    });

    it('computes availability from branch stock for COMMANDABLE products', async () => {
      repo.find.mockResolvedValue([
        makeProduct({ id: 'prod-1' }),
        makeProduct({ id: 'prod-2' }),
      ]);
      inventoryRepo.find.mockResolvedValue([
        { productId: 'prod-1', quantity: 5 },
        { productId: 'prod-2', quantity: 0 },
      ]);

      const result = await service.findAvailability('co-1', 'br-1');
      expect(result.find((r) => r.productId === 'prod-1')?.available).toBe(
        true,
      );
      expect(result.find((r) => r.productId === 'prod-2')?.available).toBe(
        false,
      );
    });
  });

  describe('findAll — règle §3.2 CLAUDE.md (filtrage backend)', () => {
    it('should return only COMMANDABLE products for EMPLOYEE role', async () => {
      const commandable = makeProduct({ type: ProductType.COMMANDABLE });
      const qb = makeQb([commandable]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('EMPLOYEE');

      expect(qb.andWhere).toHaveBeenCalledWith('p.type = :type', {
        type: ProductType.COMMANDABLE,
      });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ProductType.COMMANDABLE);
    });

    it('should return all products (incl. LIBRE_SERVICE_VIP) for ADMIN', async () => {
      const vip = makeProduct({ type: ProductType.LIBRE_SERVICE_VIP });
      const qb = makeQb([vip]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('ADMIN');

      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'p.type = :type',
        expect.anything(),
      );
      expect(result[0].type).toBe(ProductType.LIBRE_SERVICE_VIP);
    });

    it('should filter by allowedRoles when product has role restrictions', async () => {
      const restricted = makeProduct({ allowedRoles: ['DEPARTMENT_MANAGER'] });
      const open = makeProduct({ id: 'prod-2', allowedRoles: null });
      const qb = makeQb([restricted, open]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('EMPLOYEE');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prod-2');
    });

    it('should match allowedRoles against the dynamic roleId (UUID) as well', async () => {
      const restricted = makeProduct({ allowedRoles: ['role-uuid-1'] });
      const qb = makeQb([restricted]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('EMPLOYEE', 'role-uuid-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prod-1');
    });
  });

  describe('findOne', () => {
    it('should return the product when found', async () => {
      repo.findOne.mockResolvedValue(makeProduct());
      const result = await service.findOne('prod-1');
      expect(result.nameEn).toBe('Coffee');
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete by setting active=false', async () => {
      const entity = makeProduct();
      repo.findOne.mockResolvedValue(entity);
      repo.save.mockResolvedValue({ ...entity, active: false });

      await service.remove('prod-1');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ active: false }),
      );
    });
  });
});
