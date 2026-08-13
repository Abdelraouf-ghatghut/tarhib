import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CleaningTask } from '../cleaning-tasks/entities/cleaning-task.entity.js';
import { RoomBooking } from '../meeting-rooms/entities/room-booking.entity.js';
import {
  MeetingPreparation,
  MeetingPreparationStatus,
} from './entities/meeting-preparation.entity.js';
import { MeetingPreparationsService } from './meeting-preparations.service.js';
import { MeetingPreparationParticipant } from './entities/meeting-preparation-participant.entity.js';
import {
  Employee,
  EmployeeScope,
} from '../employees/entities/employee.entity.js';

describe('MeetingPreparationsService', () => {
  const repo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value: MeetingPreparation) => value),
    save: jest.fn((value: MeetingPreparation) => Promise.resolve(value)),
  };
  const bookings = { find: jest.fn(), findOne: jest.fn() };
  const participants = { find: jest.fn() };
  const employees = { findBy: jest.fn() };
  const participantTransactionRepo = {
    delete: jest.fn(),
    create: jest.fn((value: Partial<MeetingPreparationParticipant>) => value),
    save: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((work: (manager: object) => unknown) =>
      work({ getRepository: () => participantTransactionRepo }),
    ),
  };
  const cleaningTasks = {
    findOne: jest.fn(),
    create: jest.fn((value: CleaningTask) => value),
    save: jest.fn((value: CleaningTask) => Promise.resolve(value)),
  };
  let service: MeetingPreparationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MeetingPreparationsService,
        { provide: getRepositoryToken(MeetingPreparation), useValue: repo },
        {
          provide: getRepositoryToken(MeetingPreparationParticipant),
          useValue: participants,
        },
        { provide: getRepositoryToken(RoomBooking), useValue: bookings },
        { provide: getRepositoryToken(CleaningTask), useValue: cleaningTasks },
        { provide: getRepositoryToken(Employee), useValue: employees },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(MeetingPreparationsService);
  });

  it('starts an assigned preparation', async () => {
    repo.findOne.mockResolvedValue({
      id: 'p',
      assignedEmployeeId: 'emp',
      status: MeetingPreparationStatus.ASSIGNED,
    });
    expect((await service.start('p', 'emp')).status).toBe(
      MeetingPreparationStatus.IN_PROGRESS,
    );
  });

  it('requires the whole checklist before ready', async () => {
    repo.findOne.mockResolvedValue({
      id: 'p',
      assignedEmployeeId: 'emp',
      status: MeetingPreparationStatus.IN_PROGRESS,
      checklist: [{ key: 'room', label: 'Room', done: false }],
    });
    await expect(
      service.transition('p', MeetingPreparationStatus.READY, 'emp'),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks ready when checklist is complete', async () => {
    repo.findOne.mockResolvedValue({
      id: 'p',
      assignedEmployeeId: 'emp',
      status: MeetingPreparationStatus.IN_PROGRESS,
      checklist: [{ key: 'room', label: 'Room', done: true }],
    });
    expect(
      (await service.transition('p', MeetingPreparationStatus.READY, 'emp'))
        .status,
    ).toBe(MeetingPreparationStatus.READY);
  });

  it('creates one cleanup task when service completes', async () => {
    repo.findOne.mockResolvedValue({
      id: 'p',
      bookingId: 'b',
      assignedEmployeeId: 'emp',
      status: MeetingPreparationStatus.READY,
      checklist: [],
    });
    cleaningTasks.findOne.mockResolvedValue(null);
    bookings.findOne.mockResolvedValue({
      id: 'b',
      roomId: 'room',
      companyId: 'co',
      endTime: new Date('2026-07-15T12:00:00Z'),
      room: { branchId: 'br', nameAr: 'قاعة', nameEn: 'Room' },
    });
    await service.transition('p', MeetingPreparationStatus.COMPLETED, 'emp');
    expect(cleaningTasks.save).toHaveBeenCalledWith(
      expect.objectContaining({ sourceBookingId: 'b', roomId: 'room' }),
    );
  });

  it('lets the responsible define the preparation team', async () => {
    repo.findOne.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      branchId: '00000000-0000-4000-8000-000000000010',
      assignedEmployeeId: '00000000-0000-4000-8000-000000000020',
      status: MeetingPreparationStatus.ASSIGNED,
    });
    employees.findBy.mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-000000000030',
        branchId: '00000000-0000-4000-8000-000000000010',
        scope: EmployeeScope.TARHIB,
        active: true,
      },
    ]);

    const result = await service.setTeam(
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000020',
      ['00000000-0000-4000-8000-000000000030'],
    );

    expect(result.participantEmployeeIds).toEqual([
      '00000000-0000-4000-8000-000000000030',
    ]);
    expect(participantTransactionRepo.delete).toHaveBeenCalledWith({
      preparationId: '00000000-0000-4000-8000-000000000001',
    });
    expect(participantTransactionRepo.save).toHaveBeenCalled();
  });

  it('rejects a participant from another branch', async () => {
    repo.findOne.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      branchId: '00000000-0000-4000-8000-000000000010',
      assignedEmployeeId: '00000000-0000-4000-8000-000000000020',
      status: MeetingPreparationStatus.ASSIGNED,
    });
    employees.findBy.mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-000000000030',
        branchId: '00000000-0000-4000-8000-000000000099',
        scope: EmployeeScope.TARHIB,
        active: true,
      },
    ]);

    await expect(
      service.setTeam(
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000020',
        ['00000000-0000-4000-8000-000000000030'],
      ),
    ).rejects.toThrow(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
