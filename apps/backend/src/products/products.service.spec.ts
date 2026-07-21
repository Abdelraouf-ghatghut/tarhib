import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { Product } from './entities/product.entity.js';
import { ProductFavorite } from './entities/product-favorite.entity.js';
import { ProductRecipeLine } from './entities/product-recipe-line.entity.js';
import { ProductSupplierPrice } from './entities/product-supplier-price.entity.js';
import { ProductType } from './dto/product.dto.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { Supplier } from '../suppliers/entities/supplier.entity.js';

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
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
  let favoritesRepo: ReturnType<typeof mockRepo>;
  let inventoryRepo: ReturnType<typeof mockRepo>;
  let recipeRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: getRepositoryToken(ProductFavorite), useFactory: mockRepo },
        { provide: getRepositoryToken(InventoryItem), useFactory: mockRepo },
        {
          provide: getRepositoryToken(ProductRecipeLine),
          useFactory: mockRepo,
        },
        {
          provide: getRepositoryToken(ProductSupplierPrice),
          useFactory: mockRepo,
        },
        { provide: getRepositoryToken(Supplier), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repo = module.get(getRepositoryToken(Product));
    favoritesRepo = module.get(getRepositoryToken(ProductFavorite));
    inventoryRepo = module.get(getRepositoryToken(InventoryItem));
    recipeRepo = module.get(getRepositoryToken(ProductRecipeLine));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create/update — isPurchased/isSold/isVipSelfService dérivés de type', () => {
    beforeEach(() => {
      repo.create.mockImplementation((v: unknown) => v);
      repo.save.mockImplementation((v: unknown) => Promise.resolve(v));
    });

    it('derives isSold=true, isVipSelfService=false for COMMANDABLE when flags are omitted', async () => {
      const dto = {
        nameAr: 'قهوة',
        category: 'beverages',
        type: ProductType.COMMANDABLE,
        active: true,
      } as Parameters<typeof service.create>[0];

      const result = await service.create(dto);

      expect(result.isSold).toBe(true);
      expect(result.isPurchased).toBe(true);
      expect(result.isVipSelfService).toBe(false);
    });

    it('derives isSold=false, isVipSelfService=true for LIBRE_SERVICE_VIP when flags are omitted', async () => {
      const dto = {
        nameAr: 'مشروب VIP',
        category: 'beverages',
        type: ProductType.LIBRE_SERVICE_VIP,
        active: true,
      } as Parameters<typeof service.create>[0];

      const result = await service.create(dto);

      expect(result.isSold).toBe(false);
      expect(result.isPurchased).toBe(true);
      expect(result.isVipSelfService).toBe(true);
    });

    it('lets explicit flags override the type-derived defaults', async () => {
      const dto = {
        nameAr: 'بن',
        category: 'ingredients',
        type: ProductType.COMMANDABLE,
        active: true,
        isSold: false,
        isPurchased: true,
        isVipSelfService: false,
      } as Parameters<typeof service.create>[0];

      const result = await service.create(dto);

      expect(result.isSold).toBe(false);
    });

    it('re-derives flags on update when type changes and flags are not explicitly sent', async () => {
      repo.findOne.mockResolvedValue(
        makeProduct({ isSold: true, isVipSelfService: false }),
      );

      const result = await service.update('prod-1', {
        type: ProductType.LIBRE_SERVICE_VIP,
      });

      expect(result.isSold).toBe(false);
      expect(result.isVipSelfService).toBe(true);
    });
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
    it('should return only isSold products for EMPLOYEE role', async () => {
      const commandable = makeProduct({ isSold: true });
      const qb = makeQb([commandable]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('EMPLOYEE');

      expect(qb.andWhere).toHaveBeenCalledWith('p.is_sold = true');
      expect(result).toHaveLength(1);
      expect(result[0].isSold).toBe(true);
    });

    it('should return all products (incl. VIP) for ADMIN', async () => {
      const vip = makeProduct({ isSold: false, isVipSelfService: true });
      const qb = makeQb([vip]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('ADMIN');

      expect(qb.andWhere).not.toHaveBeenCalledWith('p.is_sold = true');
      expect(result[0].isVipSelfService).toBe(true);
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

  describe('recette (nomenclature)', () => {
    it('adds an ingredient line to a product’s recipe', async () => {
      repo.findOne
        .mockResolvedValueOnce(makeProduct({ id: 'prod-latte' }))
        .mockResolvedValueOnce(makeProduct({ id: 'ing-coffee' }));
      recipeRepo.findOne
        .mockResolvedValueOnce(null) // ingredient has no recipe of its own
        .mockResolvedValueOnce(null) // product is not itself an ingredient elsewhere
        .mockResolvedValueOnce(null); // no existing line for this pair
      recipeRepo.create.mockImplementation((v: unknown) => v);
      recipeRepo.save.mockImplementation((v: unknown) =>
        Promise.resolve({ id: 'line-1', ...(v as object) }),
      );

      const result = await service.addRecipeLine('prod-latte', {
        ingredientProductId: 'ing-coffee',
        quantity: 7,
      });

      expect(result.ingredientProductId).toBe('ing-coffee');
      expect(result.quantity).toBe(7);
    });

    it('rejects a line where the product references itself', async () => {
      await expect(
        service.addRecipeLine('prod-1', {
          ingredientProductId: 'prod-1',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects nesting — the ingredient already has its own recipe', async () => {
      repo.findOne
        .mockResolvedValueOnce(makeProduct({ id: 'prod-combo' }))
        .mockResolvedValueOnce(makeProduct({ id: 'prod-latte' }));
      recipeRepo.findOne
        .mockResolvedValueOnce({ id: 'existing-line' }) // ingredient (prod-latte) has a recipe
        .mockResolvedValueOnce(null);

      await expect(
        service.addRecipeLine('prod-combo', {
          ingredientProductId: 'prod-latte',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects nesting — the product is already used as an ingredient elsewhere', async () => {
      repo.findOne
        .mockResolvedValueOnce(makeProduct({ id: 'ing-coffee' }))
        .mockResolvedValueOnce(makeProduct({ id: 'ing-sugar' }));
      recipeRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-line' }); // ing-coffee already used as an ingredient

      await expect(
        service.addRecipeLine('ing-coffee', {
          ingredientProductId: 'ing-sugar',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('recipeSnapshotsFor returns [] for an empty productIds list without querying', async () => {
      const result = await service.recipeSnapshotsFor([]);
      expect(result).toEqual([]);
      expect(recipeRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('favorites', () => {
    it('returns favorite product ids newest first', async () => {
      favoritesRepo.find.mockResolvedValue([
        { productId: 'prod-2' },
        { productId: 'prod-1' },
      ]);

      await expect(service.findFavoriteIds('emp-1')).resolves.toEqual([
        'prod-2',
        'prod-1',
      ]);
      expect(favoritesRepo.find).toHaveBeenCalledWith({
        select: { productId: true },
        where: { employeeId: 'emp-1' },
        order: { createdAt: 'DESC' },
      });
    });

    it('adds a favorite for an active product', async () => {
      repo.findOne.mockResolvedValue(makeProduct({ id: 'prod-1' }));
      favoritesRepo.upsert.mockResolvedValue(undefined);
      favoritesRepo.find.mockResolvedValue([{ productId: 'prod-1' }]);

      await expect(service.addFavorite('emp-1', 'prod-1')).resolves.toEqual([
        'prod-1',
      ]);
      expect(favoritesRepo.upsert).toHaveBeenCalledWith(
        { employeeId: 'emp-1', productId: 'prod-1' },
        ['employeeId', 'productId'],
      );
    });

    it('rejects favorite creation for an unknown product', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.addFavorite('emp-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('removes a favorite and returns the remaining ids', async () => {
      favoritesRepo.delete.mockResolvedValue(undefined);
      favoritesRepo.find.mockResolvedValue([{ productId: 'prod-2' }]);

      await expect(service.removeFavorite('emp-1', 'prod-1')).resolves.toEqual([
        'prod-2',
      ]);
      expect(favoritesRepo.delete).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        productId: 'prod-1',
      });
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
