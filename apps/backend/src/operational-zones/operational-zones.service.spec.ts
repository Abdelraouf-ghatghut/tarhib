import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import {
  Employee,
  EmployeeScope,
} from '../employees/entities/employee.entity.js';
import { EmployeeZoneAssignment } from './entities/employee-zone-assignment.entity.js';
import {
  OperationalZone,
  OperationalZoneType,
} from './entities/operational-zone.entity.js';
import { OperationalZonesService } from './operational-zones.service.js';

describe('OperationalZonesService', () => {
  const zones = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value: Partial<OperationalZone>) => value),
    save: jest.fn((value: OperationalZone) => Promise.resolve(value)),
  };
  const assignments = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value: Partial<EmployeeZoneAssignment>) => value),
    save: jest.fn((value: EmployeeZoneAssignment) => Promise.resolve(value)),
  };
  const employees = { findOne: jest.fn() };
  let service: OperationalZonesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        OperationalZonesService,
        { provide: getRepositoryToken(OperationalZone), useValue: zones },
        {
          provide: getRepositoryToken(EmployeeZoneAssignment),
          useValue: assignments,
        },
        { provide: getRepositoryToken(Employee), useValue: employees },
      ],
    }).compile();
    service = module.get(OperationalZonesService);
  });

  it('normalizes duplicate floors when creating a zone', async () => {
    await service.create({
      type: OperationalZoneType.DELIVERY,
      floors: [' 1 ', '1', '2'],
    });
    expect(zones.create).toHaveBeenCalledWith(
      expect.objectContaining({ floors: ['1', '2'] }),
    );
  });

  it('assigns an active internal employee from the same branch', async () => {
    zones.findOne.mockResolvedValue({ id: 'zone', branchId: 'branch' });
    employees.findOne.mockResolvedValue({
      id: 'employee',
      branchId: 'branch',
      scope: EmployeeScope.TARHIB,
      active: true,
    });
    assignments.findOne.mockResolvedValue(null);

    const result = await service.assign('zone', 'employee', 'manager');

    expect(result).toEqual(
      expect.objectContaining({ zoneId: 'zone', employeeId: 'employee' }),
    );
  });

  it('rejects an employee from another branch', async () => {
    zones.findOne.mockResolvedValue({ id: 'zone', branchId: 'branch-a' });
    employees.findOne.mockResolvedValue({
      id: 'employee',
      branchId: 'branch-b',
      scope: EmployeeScope.TARHIB,
      active: true,
    });

    await expect(service.assign('zone', 'employee', 'manager')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns only currently active assigned zones', async () => {
    assignments.find.mockResolvedValue([{ zoneId: 'zone-1' }]);
    zones.find.mockResolvedValue([
      { id: 'zone-1', active: true },
      { id: 'zone-2', active: true },
    ]);
    await expect(service.mine('employee')).resolves.toEqual([
      { id: 'zone-1', active: true },
    ]);
  });
});
