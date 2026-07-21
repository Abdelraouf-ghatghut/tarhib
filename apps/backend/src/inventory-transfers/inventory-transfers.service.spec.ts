import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryTransfersService } from './inventory-transfers.service';
import {
  InventoryTransfer,
  TransferStatus,
} from './entities/inventory-transfer.entity.js';
import {
  InventoryItem,
  StockZone,
} from '../inventory/entities/inventory-item.entity.js';

const mockRepo = () => ({
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => Promise.resolve(v)),
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
});

describe('InventoryTransfersService', () => {
  let service: InventoryTransfersService;
  let transferRepo: ReturnType<typeof mockRepo>;
  let inventoryRepo: ReturnType<typeof mockRepo>;

  const dto = {
    companyId: 'co-1',
    branchId: 'br-1',
    productId: 'prod-1',
    fromZone: StockZone.CENTRAL,
    toZone: StockZone.BRANCH,
    quantity: 10,
    note: undefined,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryTransfersService,
        {
          provide: getRepositoryToken(InventoryTransfer),
          useFactory: mockRepo,
        },
        { provide: getRepositoryToken(InventoryItem), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(InventoryTransfersService);
    transferRepo = module.get(getRepositoryToken(InventoryTransfer));
    inventoryRepo = module.get(getRepositoryToken(InventoryItem));

    // confirmAtomic() route toutes ses requêtes via manager.transaction — le
    // faux manager délègue vers les mêmes mocks de repo pour rester simple.
    const fakeManager = {
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb(fakeManager)),
      getRepository: jest.fn((entity: unknown) =>
        entity === InventoryTransfer ? transferRepo : inventoryRepo,
      ),
    };
    (transferRepo as unknown as { manager: unknown }).manager = fakeManager;
  });

  describe('create', () => {
    it('rejects identical source and destination zones', async () => {
      await expect(
        service.create({ ...dto, toZone: dto.fromZone }, 'emp-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when source stock is insufficient', async () => {
      inventoryRepo.findOne.mockResolvedValue({ quantity: 3 });
      await expect(service.create(dto, 'emp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates a PENDING transfer when source stock suffices', async () => {
      inventoryRepo.findOne.mockResolvedValue({ quantity: 50 });
      const result = await service.create(dto, 'emp-1');
      expect(result.status).toBe(TransferStatus.PENDING);
      expect(result.requestedBy).toBe('emp-1');
      expect(transferRepo.save).toHaveBeenCalled();
    });
  });

  describe('confirmAtomic', () => {
    it('throws NotFoundException when the transfer does not exist', async () => {
      transferRepo.findOne.mockResolvedValue(null);
      await expect(service.confirmAtomic('t-1', 'emp-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('is idempotent when the transfer is already confirmed', async () => {
      transferRepo.findOne.mockResolvedValue({
        id: 't-1',
        status: TransferStatus.CONFIRMED,
      });
      const result = await service.confirmAtomic('t-1', 'emp-1');
      expect(result.status).toBe(TransferStatus.CONFIRMED);
      expect(inventoryRepo.findOne).not.toHaveBeenCalled();
    });

    it('rejects a transfer that is not PENDING', async () => {
      transferRepo.findOne.mockResolvedValue({
        id: 't-1',
        status: TransferStatus.CANCELLED,
      });
      await expect(service.confirmAtomic('t-1', 'emp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects when source stock became insufficient since creation', async () => {
      transferRepo.findOne.mockResolvedValue({
        id: 't-1',
        status: TransferStatus.PENDING,
        companyId: 'co-1',
        branchId: 'br-1',
        productId: 'prod-1',
        fromZone: StockZone.CENTRAL,
        toZone: StockZone.BRANCH,
        quantity: 10,
      });
      inventoryRepo.findOne.mockResolvedValue({ quantity: 2 });
      await expect(service.confirmAtomic('t-1', 'emp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('decrements source and increments an existing destination', async () => {
      transferRepo.findOne.mockResolvedValue({
        id: 't-1',
        status: TransferStatus.PENDING,
        companyId: 'co-1',
        branchId: 'br-1',
        productId: 'prod-1',
        fromZone: StockZone.CENTRAL,
        toZone: StockZone.BRANCH,
        quantity: 10,
      });
      const source = { quantity: 50, zone: StockZone.CENTRAL };
      const destination = { quantity: 5, zone: StockZone.BRANCH };
      inventoryRepo.findOne
        .mockResolvedValueOnce(source)
        .mockResolvedValueOnce(destination);

      const result = await service.confirmAtomic('t-1', 'emp-1');

      expect(source.quantity).toBe(40);
      expect(destination.quantity).toBe(15);
      expect(result.status).toBe(TransferStatus.CONFIRMED);
      expect(result.confirmedBy).toBe('emp-1');
    });

    it('creates the destination item when it does not exist yet', async () => {
      transferRepo.findOne.mockResolvedValue({
        id: 't-1',
        status: TransferStatus.PENDING,
        companyId: 'co-1',
        branchId: 'br-1',
        productId: 'prod-1',
        fromZone: StockZone.CENTRAL,
        toZone: StockZone.BRANCH,
        quantity: 10,
      });
      inventoryRepo.findOne
        .mockResolvedValueOnce({ quantity: 50 })
        .mockResolvedValueOnce(null);

      await service.confirmAtomic('t-1', 'emp-1');

      expect(inventoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ zone: StockZone.BRANCH, quantity: 10 }),
      );
    });
  });

  describe('cancel', () => {
    it('rejects cancelling a non-PENDING transfer', async () => {
      transferRepo.findOne.mockResolvedValue({
        id: 't-1',
        status: TransferStatus.CONFIRMED,
      });
      await expect(service.cancel('t-1', 'emp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('marks a PENDING transfer as CANCELLED', async () => {
      transferRepo.findOne.mockResolvedValue({
        id: 't-1',
        status: TransferStatus.PENDING,
      });
      const result = await service.cancel('t-1', 'emp-1');
      expect(result.status).toBe(TransferStatus.CANCELLED);
      expect(result.cancelledBy).toBe('emp-1');
    });
  });
});
