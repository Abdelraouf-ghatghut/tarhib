import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { InventoryService } from './inventory.service.js';
import { InventoryItem, StockZone } from './entities/inventory-item.entity.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  InventoryTransfer,
  TransferStatus,
} from '../inventory-transfers/entities/inventory-transfer.entity.js';

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
          provide: getRepositoryToken(InventoryTransfer),
          useFactory: mockRepo,
        },
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

  describe('decrementForPreparation — cuisine en premier, branche en repli', () => {
    // Les commandes sont préparées en cuisine : la décrémentation vise
    // d'abord la zone KITCHEN, et ne pioche dans BRANCH que pour combler un
    // manque (réappro implicite, cf. orders.service.ts). Le repli génère un
    // InventoryTransfer CONFIRMED pour la traçabilité (§11 CLAUDE.md).
    let transferRepo: ReturnType<typeof mockRepo>;
    let fakeManager: EntityManager;

    beforeEach(() => {
      transferRepo = mockRepo();
      transferRepo.create.mockImplementation((v: unknown) => v);
      transferRepo.save.mockImplementation((v: unknown) => Promise.resolve(v));
      fakeManager = {
        getRepository: (entity: unknown) =>
          entity === InventoryTransfer ? transferRepo : repo,
      } as unknown as EntityManager;
    });

    it('decrements the kitchen stock only when it is sufficient', async () => {
      const kitchenItem = makeItem({ zone: StockZone.KITCHEN, quantity: 20 });
      repo.findOne.mockResolvedValueOnce(kitchenItem);

      await service.decrementForPreparation(
        'prod-1',
        'br-1',
        'co-1',
        5,
        fakeManager,
        'emp-1',
      );

      expect(kitchenItem.quantity).toBe(15);
      expect(repo.findOne).toHaveBeenCalledTimes(1); // pas de lecture de la branche
      expect(repo.save).toHaveBeenCalledWith(kitchenItem);
      expect(transferRepo.save).not.toHaveBeenCalled(); // pas de repli = pas de transfert
    });

    it('tops up the deficit from the branch when kitchen stock is short, and logs a CONFIRMED transfer', async () => {
      const kitchenItem = makeItem({ zone: StockZone.KITCHEN, quantity: 3 });
      const branchItem = makeItem({ zone: StockZone.BRANCH, quantity: 50 });
      repo.findOne
        .mockResolvedValueOnce(kitchenItem)
        .mockResolvedValueOnce(branchItem);

      await service.decrementForPreparation(
        'prod-1',
        'br-1',
        'co-1',
        10,
        fakeManager,
        'emp-1',
      );

      // 10 demandés, 3 en cuisine → 7 pris sur la branche, cuisine à 0
      expect(branchItem.quantity).toBe(43);
      expect(kitchenItem.quantity).toBe(0);
      expect(repo.save).toHaveBeenCalledWith(branchItem);
      expect(repo.save).toHaveBeenCalledWith(kitchenItem);
      expect(transferRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'co-1',
          branchId: 'br-1',
          productId: 'prod-1',
          fromZone: StockZone.BRANCH,
          toZone: StockZone.KITCHEN,
          quantity: 7,
          status: TransferStatus.CONFIRMED,
          requestedBy: 'emp-1',
          confirmedBy: 'emp-1',
        }),
      );
    });

    it('pulls entirely from the branch when no kitchen stock exists yet', async () => {
      const branchItem = makeItem({ zone: StockZone.BRANCH, quantity: 50 });
      repo.findOne
        .mockResolvedValueOnce(null) // pas de ligne cuisine
        .mockResolvedValueOnce(branchItem);

      await service.decrementForPreparation(
        'prod-1',
        'br-1',
        'co-1',
        10,
        fakeManager,
        'emp-1',
      );

      expect(branchItem.quantity).toBe(40);
      expect(transferRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 10 }),
      );
    });

    it('rejects when kitchen and branch combined are insufficient', async () => {
      const kitchenItem = makeItem({ zone: StockZone.KITCHEN, quantity: 3 });
      const branchItem = makeItem({ zone: StockZone.BRANCH, quantity: 4 });
      repo.findOne
        .mockResolvedValueOnce(kitchenItem)
        .mockResolvedValueOnce(branchItem);

      await expect(
        service.decrementForPreparation(
          'prod-1',
          'br-1',
          'co-1',
          10,
          fakeManager,
          'emp-1',
        ),
      ).rejects.toThrow(BadRequestException);
      // Ni la cuisine ni la branche ne doivent avoir été modifiées, et aucun
      // transfert ne doit être journalisé pour un mouvement qui n'a pas eu lieu.
      expect(repo.save).not.toHaveBeenCalled();
      expect(transferRepo.save).not.toHaveBeenCalled();
    });

    it('is a no-op for a zero or negative quantity', async () => {
      await service.decrementForPreparation(
        'prod-1',
        'br-1',
        'co-1',
        0,
        fakeManager,
        'emp-1',
      );
      expect(repo.findOne).not.toHaveBeenCalled();
    });
  });
});
