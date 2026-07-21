import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProcurementService } from './procurement.service.js';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from './entities/purchase-order.entity.js';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const mockRepo = () => ({
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => Promise.resolve(v)),
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
});

const makePo = (overrides: Partial<PurchaseOrder> = {}): PurchaseOrder =>
  ({
    id: 'po-1',
    companyId: 'co-1',
    branchId: 'br-1',
    supplierId: 'sup-1',
    status: PurchaseOrderStatus.DRAFT,
    notes: null,
    createdBy: 'emp-creator',
    validatedBy: null,
    rejectionReason: null,
    lines: [],
    ...overrides,
  }) as PurchaseOrder;

describe('ProcurementService — chaîne de validation des achats', () => {
  let service: ProcurementService;
  let poRepo: ReturnType<typeof mockRepo>;
  let branchRepo: ReturnType<typeof mockRepo>;
  let employeeRepo: ReturnType<typeof mockRepo>;
  let productRepo: ReturnType<typeof mockRepo>;
  let inventoryService: { addStockForReceipt: jest.Mock };
  let notifications: { notifyEmployee: jest.Mock };

  beforeEach(async () => {
    notifications = { notifyEmployee: jest.fn().mockResolvedValue(undefined) };
    inventoryService = { addStockForReceipt: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: getRepositoryToken(PurchaseOrder), useFactory: mockRepo },
        {
          provide: getRepositoryToken(PurchaseOrderLine),
          useFactory: mockRepo,
        },
        { provide: getRepositoryToken(Branch), useFactory: mockRepo },
        { provide: getRepositoryToken(Employee), useFactory: mockRepo },
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: InventoryService, useValue: inventoryService },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(ProcurementService);
    poRepo = module.get(getRepositoryToken(PurchaseOrder));
    branchRepo = module.get(getRepositoryToken(Branch));
    employeeRepo = module.get(getRepositoryToken(Employee));
    productRepo = module.get(getRepositoryToken(Product));
  });

  describe('submit', () => {
    it('moves DRAFT to PENDING_VALIDATION and notifies the branch validator', async () => {
      poRepo.findOne.mockResolvedValue(makePo());
      branchRepo.findOne.mockResolvedValue({ orderValidatorId: 'validator-1' });

      const result = await service.submit('po-1');

      expect(result.status).toBe(PurchaseOrderStatus.PENDING_VALIDATION);
      expect(notifications.notifyEmployee).toHaveBeenCalledWith(
        'validator-1',
        expect.any(String),
        expect.any(String),
      );
    });

    it('does not notify when the branch has no validator configured', async () => {
      poRepo.findOne.mockResolvedValue(makePo());
      branchRepo.findOne.mockResolvedValue({ orderValidatorId: null });

      await service.submit('po-1');

      expect(notifications.notifyEmployee).not.toHaveBeenCalled();
    });

    it('rejects submitting a non-DRAFT order', async () => {
      poRepo.findOne.mockResolvedValue(
        makePo({ status: PurchaseOrderStatus.SENT }),
      );
      await expect(service.submit('po-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('validate', () => {
    it('moves PENDING_VALIDATION to VALIDATED, records the validator, and notifies the purchasing manager', async () => {
      poRepo.findOne.mockResolvedValue(
        makePo({ status: PurchaseOrderStatus.PENDING_VALIDATION }),
      );
      branchRepo.findOne.mockResolvedValue({ purchasingManagerId: 'buyer-1' });

      const result = await service.validate('po-1', 'validator-1');

      expect(result.status).toBe(PurchaseOrderStatus.VALIDATED);
      expect(result.validatedBy).toBe('validator-1');
      expect(notifications.notifyEmployee).toHaveBeenCalledWith(
        'buyer-1',
        expect.any(String),
        expect.any(String),
      );
    });

    it('rejects validating an order not pending validation', async () => {
      poRepo.findOne.mockResolvedValue(
        makePo({ status: PurchaseOrderStatus.DRAFT }),
      );
      await expect(service.validate('po-1', 'validator-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reject', () => {
    it('resolves createdBy (Keycloak id) to the real employee and notifies them', async () => {
      poRepo.findOne.mockResolvedValue(
        makePo({ status: PurchaseOrderStatus.PENDING_VALIDATION }),
      );
      employeeRepo.findOne.mockResolvedValue({ id: 'real-employee-id' });

      const result = await service.reject(
        'po-1',
        { reason: 'Prix trop élevé' },
        'rejector-1',
      );

      expect(result.status).toBe(PurchaseOrderStatus.DRAFT);
      expect(result.rejectionReason).toBe('Prix trop élevé');
      expect(employeeRepo.findOne).toHaveBeenCalledWith({
        where: { keycloakId: 'emp-creator' },
      });
      expect(notifications.notifyEmployee).toHaveBeenCalledWith(
        'real-employee-id',
        expect.any(String),
        'Prix trop élevé',
      );
    });

    it('skips notification silently when the creator cannot be resolved', async () => {
      poRepo.findOne.mockResolvedValue(
        makePo({ status: PurchaseOrderStatus.PENDING_VALIDATION }),
      );
      employeeRepo.findOne.mockResolvedValue(null);

      await service.reject('po-1', { reason: 'x' }, 'rejector-1');

      expect(notifications.notifyEmployee).not.toHaveBeenCalled();
    });

    it('rejects rejecting an order not pending validation', async () => {
      poRepo.findOne.mockResolvedValue(
        makePo({ status: PurchaseOrderStatus.DRAFT }),
      );
      await expect(
        service.reject('po-1', { reason: 'x' }, 'rejector-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('send', () => {
    it('allows sending a DRAFT order (validation chain not configured)', async () => {
      poRepo.findOne.mockResolvedValue(makePo());
      const result = await service.send('po-1', 'sender-1');
      expect(result.status).toBe(PurchaseOrderStatus.SENT);
    });

    it('allows sending a VALIDATED order', async () => {
      poRepo.findOne.mockResolvedValue(
        makePo({ status: PurchaseOrderStatus.VALIDATED }),
      );
      const result = await service.send('po-1', 'sender-1');
      expect(result.status).toBe(PurchaseOrderStatus.SENT);
    });

    it('rejects sending an order still pending validation', async () => {
      poRepo.findOne.mockResolvedValue(
        makePo({ status: PurchaseOrderStatus.PENDING_VALIDATION }),
      );
      await expect(service.send('po-1', 'sender-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('receive — conversion unité d’achat → stock', () => {
    it('adds stock as-is when unitsPerPurchase is 1 (no conversion)', async () => {
      const line = {
        id: 'line-1',
        productId: 'prod-coffee',
        orderedQty: 10,
        receivedQty: 0,
      } as PurchaseOrderLine;
      poRepo.findOne.mockResolvedValue(
        makePo({ status: PurchaseOrderStatus.SENT, lines: [line] }),
      );
      productRepo.find.mockResolvedValue([
        { id: 'prod-coffee', unitsPerPurchase: 1 },
      ]);

      await service.receive(
        'po-1',
        { lines: [{ lineId: 'line-1', receivedQty: 10 }] },
        'agent-1',
      );

      expect(inventoryService.addStockForReceipt).toHaveBeenCalledWith(
        'prod-coffee',
        'br-1',
        'co-1',
        10,
      );
    });

    it('converts purchase units to stock units (1 sac = 1000g)', async () => {
      const line = {
        id: 'line-1',
        productId: 'prod-coffee',
        orderedQty: 10,
        receivedQty: 0,
      } as PurchaseOrderLine;
      poRepo.findOne.mockResolvedValue(
        makePo({ status: PurchaseOrderStatus.SENT, lines: [line] }),
      );
      productRepo.find.mockResolvedValue([
        { id: 'prod-coffee', unitsPerPurchase: 1000 },
      ]);

      await service.receive(
        'po-1',
        { lines: [{ lineId: 'line-1', receivedQty: 2 }] },
        'agent-1',
      );

      // 2 sacs reçus × 1000g/sac = 2000g ajoutés au stock
      expect(inventoryService.addStockForReceipt).toHaveBeenCalledWith(
        'prod-coffee',
        'br-1',
        'co-1',
        2000,
      );
    });
  });

  describe('unknown order', () => {
    it('throws NotFoundException for submit/validate/reject on an unknown id', async () => {
      poRepo.findOne.mockResolvedValue(null);
      await expect(service.submit('ghost')).rejects.toThrow(NotFoundException);
      await expect(service.validate('ghost', 'v1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(
        service.reject('ghost', { reason: 'x' }, 'rejector-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
