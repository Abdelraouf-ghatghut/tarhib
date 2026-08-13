import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import {
  OperationalZone,
  OperationalZoneType,
} from '../operational-zones/entities/operational-zone.entity.js';
import { OperationalZonesService } from '../operational-zones/operational-zones.service.js';
import {
  CleaningTask,
  CleaningTaskStatus,
} from './entities/cleaning-task.entity.js';
import { CleaningTasksService } from './cleaning-tasks.service.js';

describe('CleaningTasksService', () => {
  const execute = jest.fn();
  const queryBuilder = {
    update: jest.fn(),
    set: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    execute,
  };
  for (const method of ['update', 'set', 'where', 'andWhere'] as const) {
    queryBuilder[method].mockReturnValue(queryBuilder);
  }
  const repo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value: Partial<CleaningTask>) => value),
    save: jest.fn((value: CleaningTask) => Promise.resolve(value)),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };
  const operationalZones = {
    findOne: jest.fn(),
    floorKey: jest.fn((floor: string) => floor.trim().toLowerCase()),
  };
  let service: CleaningTasksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CleaningTasksService,
        { provide: getRepositoryToken(CleaningTask), useValue: repo },
        { provide: OperationalZonesService, useValue: operationalZones },
      ],
    }).compile();
    service = module.get(CleaningTasksService);
  });

  it('accepts a task whose floor belongs to the selected cleaning zone', async () => {
    operationalZones.findOne.mockResolvedValue({
      id: 'zone',
      type: OperationalZoneType.CLEANING,
      companyId: 'company',
      branchId: 'branch',
      floors: ['1', '2'],
    } satisfies Partial<OperationalZone>);

    await service.create({
      companyId: 'company',
      branchId: 'branch',
      operationalZoneId: 'zone',
      floor: '2',
    });

    expect(repo.save).toHaveBeenCalled();
  });

  it('rejects a task outside the selected zone', async () => {
    operationalZones.findOne.mockResolvedValue({
      id: 'zone',
      type: OperationalZoneType.CLEANING,
      companyId: 'company',
      branchId: 'branch',
      floors: ['1'],
    } satisfies Partial<OperationalZone>);

    await expect(
      service.create({
        companyId: 'company',
        branchId: 'branch',
        operationalZoneId: 'zone',
        floor: '5',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('claims and starts an available task atomically', async () => {
    execute.mockResolvedValue({ affected: 1 });
    repo.findOne.mockResolvedValue({
      id: 'task',
      assignedEmployeeId: 'employee',
      status: CleaningTaskStatus.IN_PROGRESS,
    });

    const result = await service.claimAndStart('task', 'employee', ['zone']);

    expect(result.status).toBe(CleaningTaskStatus.IN_PROGRESS);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'operational_zone_id IN (:...zoneIds)',
      { zoneIds: ['zone'] },
    );
  });

  it('rejects a concurrent claim lost to another employee', async () => {
    execute.mockResolvedValue({ affected: 0 });
    await expect(
      service.claimAndStart('task', 'employee', ['zone']),
    ).rejects.toThrow(BadRequestException);
  });
});
