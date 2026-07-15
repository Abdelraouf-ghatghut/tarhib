import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { OrdersService } from '../orders/orders.service.js';
import { DeliveryService } from './delivery.service.js';
import {
  DeliveryTask,
  DeliveryTaskStatus,
} from './entities/delivery-task.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

describe('DeliveryService', () => {
  const repo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((v: DeliveryTask) => v),
    save: jest.fn((v: DeliveryTask) => Promise.resolve(v)),
  };
  const orders = { findAll: jest.fn(), updateStatus: jest.fn() };
  const lookupRepo = { findBy: jest.fn().mockResolvedValue([]) };
  const notifications = { notifyByPermission: jest.fn() };
  let service: DeliveryService;
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: getRepositoryToken(DeliveryTask), useValue: repo },
        { provide: getRepositoryToken(Employee), useValue: lookupRepo },
        { provide: getRepositoryToken(Company), useValue: lookupRepo },
        { provide: getRepositoryToken(Branch), useValue: lookupRepo },
        { provide: NotificationsService, useValue: notifications },
        { provide: OrdersService, useValue: orders },
      ],
    }).compile();
    service = module.get(DeliveryService);
  });

  it('creates an available task for a ready order', async () => {
    orders.findAll.mockResolvedValue([
      {
        id: 'order-1',
        companyId: 'co-1',
        branchId: 'br-1',
        slaDeadline: new Date().toISOString(),
      },
    ]);
    repo.findOne.mockResolvedValue(null);
    repo.find.mockResolvedValue([
      {
        id: 'task-1',
        orderId: 'order-1',
        status: DeliveryTaskStatus.AVAILABLE,
      },
    ]);
    const result = await service.queue('co-1', 'br-1');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        status: DeliveryTaskStatus.AVAILABLE,
      }),
    );
    expect(result).toHaveLength(1);
  });

  it('does not allow pickup before assignment', async () => {
    repo.findOne.mockResolvedValue({
      id: 'task-1',
      assignedEmployeeId: 'emp-1',
      status: DeliveryTaskStatus.AVAILABLE,
    });
    await expect(
      service.transition('task-1', DeliveryTaskStatus.PICKED_UP, {
        sub: 'kc-1',
        employeeId: 'emp-1',
        permissions: ['order.deliver'],
      } as never),
    ).rejects.toThrow(BadRequestException);
  });
});
