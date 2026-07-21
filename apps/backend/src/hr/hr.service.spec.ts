import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HrService } from './hr.service.js';
import { LeaveType } from './entities/leave-type.entity.js';
import {
  LeaveRequest,
  LeaveRequestStatus,
} from './entities/leave-request.entity.js';
import { LeaveBalance } from './entities/leave-balance.entity.js';
import {
  EmploymentContract,
  EmploymentContractType,
} from './entities/employment-contract.entity.js';
import { PerformanceReview } from './entities/performance-review.entity.js';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => v),
});

describe('HrService', () => {
  let service: HrService;
  let leaveTypeRepo: ReturnType<typeof mockRepo>;
  let leaveRequestRepo: ReturnType<typeof mockRepo>;
  let leaveBalanceRepo: ReturnType<typeof mockRepo>;
  let contractRepo: ReturnType<typeof mockRepo>;
  let reviewRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrService,
        { provide: getRepositoryToken(LeaveType), useFactory: mockRepo },
        { provide: getRepositoryToken(LeaveRequest), useFactory: mockRepo },
        { provide: getRepositoryToken(LeaveBalance), useFactory: mockRepo },
        {
          provide: getRepositoryToken(EmploymentContract),
          useFactory: mockRepo,
        },
        {
          provide: getRepositoryToken(PerformanceReview),
          useFactory: mockRepo,
        },
      ],
    }).compile();

    service = module.get(HrService);
    leaveTypeRepo = module.get(getRepositoryToken(LeaveType));
    leaveRequestRepo = module.get(getRepositoryToken(LeaveRequest));
    leaveBalanceRepo = module.get(getRepositoryToken(LeaveBalance));
    contractRepo = module.get(getRepositoryToken(EmploymentContract));
    reviewRepo = module.get(getRepositoryToken(PerformanceReview));
  });

  describe('createLeaveRequest', () => {
    it('computes an inclusive day count from start/end dates', async () => {
      const result = await service.createLeaveRequest({
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-08-01',
        endDate: '2026-08-03',
      });

      expect(result.daysCount).toBe(3);
    });

    it('rejects an end date before the start date', async () => {
      await expect(
        service.createLeaveRequest({
          employeeId: 'emp-1',
          leaveTypeId: 'lt-1',
          startDate: '2026-08-05',
          endDate: '2026-08-01',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('approveLeaveRequest', () => {
    it('marks the request APPROVED and creates a leave balance row reflecting the days taken', async () => {
      leaveRequestRepo.findOne.mockResolvedValue({
        id: 'lr-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-08-01',
        endDate: '2026-08-03',
        daysCount: 3,
        status: LeaveRequestStatus.PENDING,
      });
      leaveBalanceRepo.findOne.mockResolvedValue(null);
      leaveTypeRepo.findOne.mockResolvedValue({
        id: 'lt-1',
        defaultDaysPerYear: 21,
      });

      const result = await service.approveLeaveRequest('lr-1', 'manager-1');

      expect(result.status).toBe(LeaveRequestStatus.APPROVED);
      expect(leaveBalanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ entitled: 21, taken: 3 }),
      );
    });

    it('adds to an existing balance row rather than creating a duplicate', async () => {
      leaveRequestRepo.findOne.mockResolvedValue({
        id: 'lr-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-08-01',
        daysCount: 3,
        status: LeaveRequestStatus.PENDING,
      });
      leaveBalanceRepo.findOne.mockResolvedValue({
        id: 'bal-1',
        entitled: 21,
        taken: 5,
      });

      await service.approveLeaveRequest('lr-1', 'manager-1');

      expect(leaveBalanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ taken: 8 }),
      );
    });

    it('rejects approving a request that is not PENDING', async () => {
      leaveRequestRepo.findOne.mockResolvedValue({
        id: 'lr-1',
        status: LeaveRequestStatus.APPROVED,
      });

      await expect(
        service.approveLeaveRequest('lr-1', 'manager-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException for an unknown request', async () => {
      leaveRequestRepo.findOne.mockResolvedValue(null);
      await expect(
        service.approveLeaveRequest('missing', 'manager-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('rejectLeaveRequest', () => {
    it('marks the request REJECTED without touching leave balances', async () => {
      leaveRequestRepo.findOne.mockResolvedValue({
        id: 'lr-1',
        status: LeaveRequestStatus.PENDING,
      });

      const result = await service.rejectLeaveRequest('lr-1', 'manager-1');

      expect(result.status).toBe(LeaveRequestStatus.REJECTED);
      expect(leaveBalanceRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findLeaveBalances', () => {
    it('derives remaining as entitled minus taken', async () => {
      leaveBalanceRepo.find.mockResolvedValue([
        {
          id: 'b1',
          employeeId: 'emp-1',
          leaveTypeId: 'lt-1',
          year: 2026,
          entitled: 21,
          taken: 8,
        },
      ]);

      const result = await service.findLeaveBalances({ employeeId: 'emp-1' });
      expect(result[0].remaining).toBe(13);
    });
  });

  describe('employment contracts', () => {
    it('creates a contract with a snapshot base salary', async () => {
      const result = await service.createContract({
        employeeId: 'emp-1',
        type: EmploymentContractType.CDI,
        startDate: '2026-01-01',
        jobTitle: 'Cook',
        baseSalary: 2500,
      });
      expect(result.baseSalary).toBe(2500);
      expect(result.status).toBe('ACTIVE');
    });

    it('throws NotFoundException when updating an unknown contract', async () => {
      contractRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateContract('missing', { jobTitle: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('performance reviews', () => {
    it('creates a review defaulting to DRAFT status', async () => {
      const result = await service.createReview({
        employeeId: 'emp-1',
        reviewerId: 'mgr-1',
        reviewDate: '2026-07-01',
        rating: 4,
      });
      expect(result.status).toBe('DRAFT');
      expect(reviewRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 4, status: 'DRAFT' }),
      );
    });
  });
});
