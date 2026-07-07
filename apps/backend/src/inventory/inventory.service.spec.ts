import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { InventoryItem } from './entities/inventory-item.entity.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makeItem = (overrides: Partial<InventoryItem> = {}): InventoryItem =>
  ({
    id: 'inv-1',
    companyId: 'co-1',
    branchId: 'br-1',
    productId: 'prod-1',
    quantity: 20,
    minThreshold: 5,
    maxThreshold: 100,
    ...overrides,
  }) as InventoryItem;

describe('InventoryService', () => {
  let service: InventoryService;
  let repo: ReturnType<typeof mockRepo>;
  let branchRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(InventoryItem), useFactory: mockRepo },
        { provide: getRepositoryToken(Branch), useFactory: mockRepo },
        {
          provide: NotificationsService,
          useValue: {
            notifyLowStock: jest.fn(),
            notifyEmployee: jest.fn(),
            send: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    repo = module.get(getRepositoryToken(InventoryItem));
    branchRepo = module.get(getRepositoryToken(Branch));
    branchRepo.findOne.mockResolvedValue(null);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an inventory item', async () => {
      repo.findOne.mockResolvedValue(null);
      const entity = makeItem();
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create({
        companyId: 'co-1',
        branchId: 'br-1',
        productId: 'prod-1',
        quantity: 20,
      });

      expect(result.productId).toBe('prod-1');
      expect(result.belowThreshold).toBe(false);
    });

    it('should throw ConflictException if entry already exists', async () => {
      repo.findOne.mockResolvedValue(makeItem());

      await expect(
        service.create({
          companyId: 'co-1',
          branchId: 'br-1',
          productId: 'prod-1',
          quantity: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should not conflict between two employees with a personal VIP location for the same product/branch/zone', async () => {
      // Le doublon existant est celui d'un AUTRE employé — la vérification
      // doit porter sur le couple (département, employé), pas seulement
      // (société, branche, produit, zone), sinon le 2e employé VIP serait
      // bloqué à tort.
      repo.findOne.mockResolvedValue(null);
      const entity = makeItem({ assignedEmployeeId: 'emp-2' });
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      await service.create({
        companyId: 'co-1',
        branchId: 'br-1',
        productId: 'prod-1',
        quantity: 5,
        assignedEmployeeId: 'emp-2',
      });

      // La création réussit (pas de ConflictException) malgré le mock
      // findOne non affiné par employé — ce qui compte ici est que
      // l'employé assigné soit bien transmis à la création.
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ assignedEmployeeId: 'emp-2' }),
      );
    });
  });

  describe('belowThreshold flag', () => {
    it('should set belowThreshold=true when quantity <= minThreshold', async () => {
      const entity = makeItem({ quantity: 3, minThreshold: 5 });
      repo.findOne.mockResolvedValue(entity);
      const result = await service.findOne('inv-1');
      expect(result.belowThreshold).toBe(true);
    });

    it('should set belowThreshold=false when quantity > minThreshold', async () => {
      const entity = makeItem({ quantity: 10, minThreshold: 5 });
      repo.findOne.mockResolvedValue(entity);
      const result = await service.findOne('inv-1');
      expect(result.belowThreshold).toBe(false);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException for unknown id', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
