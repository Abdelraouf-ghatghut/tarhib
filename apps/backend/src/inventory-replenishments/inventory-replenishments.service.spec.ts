import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { InventoryTransfersService } from '../inventory-transfers/inventory-transfers.service.js';
import {
  InventoryReplenishmentRequest,
  ReplenishmentStatus,
} from './entities/inventory-replenishment.entity.js';
import { InventoryReplenishmentsService } from './inventory-replenishments.service.js';
describe('InventoryReplenishmentsService', () => {
  const repo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((v: InventoryReplenishmentRequest) => v),
    save: jest.fn((v: InventoryReplenishmentRequest) => Promise.resolve(v)),
  };
  const transfers = { create: jest.fn(), confirm: jest.fn() };
  let service: InventoryReplenishmentsService;
  beforeEach(async () => {
    jest.clearAllMocks();
    const m = await Test.createTestingModule({
      providers: [
        InventoryReplenishmentsService,
        {
          provide: getRepositoryToken(InventoryReplenishmentRequest),
          useValue: repo,
        },
        { provide: InventoryTransfersService, useValue: transfers },
      ],
    }).compile();
    service = m.get(InventoryReplenishmentsService);
  });
  it('creates a kitchen request', async () => {
    const result = await service.create(
      { companyId: 'co', branchId: 'br', productId: 'prod', requestedQty: 4 },
      'emp',
    );
    expect(result.status).toBe(ReplenishmentStatus.REQUESTED);
  });
  it('approves by creating a branch to kitchen transfer', async () => {
    repo.findOne.mockResolvedValue({
      id: 'req',
      companyId: 'co',
      branchId: 'br',
      productId: 'prod',
      requestedQty: 4,
      status: ReplenishmentStatus.REQUESTED,
    });
    transfers.create.mockResolvedValue({ id: 'transfer' });
    const result = await service.approve('req', 'manager');
    expect(result.transferId).toBe('transfer');
    expect(result.status).toBe(ReplenishmentStatus.APPROVED);
  });
  it('rejects non-positive quantities', () => {
    expect(() =>
      service.create(
        { companyId: 'co', branchId: 'br', productId: 'prod', requestedQty: 0 },
        'emp',
      ),
    ).toThrow(BadRequestException);
  });
});
