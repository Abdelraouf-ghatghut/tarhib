import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveType } from './entities/leave-type.entity.js';
import {
  LeaveRequest,
  LeaveRequestStatus,
} from './entities/leave-request.entity.js';
import { LeaveBalance } from './entities/leave-balance.entity.js';
import {
  EmploymentContract,
  EmploymentContractStatus,
} from './entities/employment-contract.entity.js';
import {
  PerformanceReview,
  PerformanceReviewStatus,
} from './entities/performance-review.entity.js';
import {
  CreateEmploymentContractDto,
  CreateLeaveRequestDto,
  CreateLeaveTypeDto,
  CreatePerformanceReviewDto,
  EmploymentContractDto,
  LeaveBalanceDto,
  LeaveRequestDto,
  LeaveTypeDto,
  PerformanceReviewDto,
  UpdateEmploymentContractDto,
  UpdateLeaveTypeDto,
  UpdatePerformanceReviewDto,
} from './dto/hr.dto.js';

const daysBetweenInclusive = (start: string, end: string): number => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / 86_400_000) + 1;
};

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(LeaveType)
    private readonly leaveTypeRepo: Repository<LeaveType>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepo: Repository<LeaveRequest>,
    @InjectRepository(LeaveBalance)
    private readonly leaveBalanceRepo: Repository<LeaveBalance>,
    @InjectRepository(EmploymentContract)
    private readonly contractRepo: Repository<EmploymentContract>,
    @InjectRepository(PerformanceReview)
    private readonly reviewRepo: Repository<PerformanceReview>,
  ) {}

  // ---- Leave types ----

  async createLeaveType(dto: CreateLeaveTypeDto): Promise<LeaveTypeDto> {
    const entity = this.leaveTypeRepo.create({
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
      defaultDaysPerYear: dto.defaultDaysPerYear,
      active: dto.active ?? true,
    });
    return this.toLeaveTypeDto(await this.leaveTypeRepo.save(entity));
  }

  async findAllLeaveTypes(): Promise<LeaveTypeDto[]> {
    const rows = await this.leaveTypeRepo.find({ order: { nameEn: 'ASC' } });
    return rows.map((r) => this.toLeaveTypeDto(r));
  }

  async updateLeaveType(
    id: string,
    dto: UpdateLeaveTypeDto,
  ): Promise<LeaveTypeDto> {
    const entity = await this.leaveTypeRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Leave type ${id} not found`);
    Object.assign(entity, dto);
    return this.toLeaveTypeDto(await this.leaveTypeRepo.save(entity));
  }

  // ---- Leave requests ----

  async createLeaveRequest(
    dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequestDto> {
    const daysCount = daysBetweenInclusive(dto.startDate, dto.endDate);
    if (daysCount <= 0) {
      throw new ConflictException('leaveRequestInvalidRange');
    }
    const entity = this.leaveRequestRepo.create({
      employeeId: dto.employeeId,
      leaveTypeId: dto.leaveTypeId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      daysCount,
      reason: dto.reason ?? null,
    });
    return this.toLeaveRequestDto(await this.leaveRequestRepo.save(entity));
  }

  async findAllLeaveRequests(filters: {
    employeeId?: string;
    status?: LeaveRequestStatus;
  }): Promise<LeaveRequestDto[]> {
    const rows = await this.leaveRequestRepo.find({
      where: {
        ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      order: { startDate: 'DESC' },
    });
    return rows.map((r) => this.toLeaveRequestDto(r));
  }

  async approveLeaveRequest(
    id: string,
    approverId: string,
  ): Promise<LeaveRequestDto> {
    const request = await this.leaveRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException(`Leave request ${id} not found`);
    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new ConflictException('leaveRequestNotPending');
    }
    request.status = LeaveRequestStatus.APPROVED;
    request.approverId = approverId;
    const saved = await this.leaveRequestRepo.save(request);
    await this.addTakenDays(request);
    return this.toLeaveRequestDto(saved);
  }

  async rejectLeaveRequest(
    id: string,
    approverId: string,
  ): Promise<LeaveRequestDto> {
    const request = await this.leaveRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException(`Leave request ${id} not found`);
    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new ConflictException('leaveRequestNotPending');
    }
    request.status = LeaveRequestStatus.REJECTED;
    request.approverId = approverId;
    return this.toLeaveRequestDto(await this.leaveRequestRepo.save(request));
  }

  private async addTakenDays(request: LeaveRequest): Promise<void> {
    const year = Number(request.startDate.slice(0, 4));
    let balance = await this.leaveBalanceRepo.findOne({
      where: {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        year,
      },
    });
    if (!balance) {
      const leaveType = await this.leaveTypeRepo.findOne({
        where: { id: request.leaveTypeId },
      });
      balance = this.leaveBalanceRepo.create({
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        year,
        entitled: leaveType?.defaultDaysPerYear ?? 0,
        taken: 0,
      });
    }
    balance.taken = Number(balance.taken) + Number(request.daysCount);
    await this.leaveBalanceRepo.save(balance);
  }

  // ---- Leave balances ----

  async findLeaveBalances(filters: {
    employeeId?: string;
    year?: number;
  }): Promise<LeaveBalanceDto[]> {
    const rows = await this.leaveBalanceRepo.find({
      where: {
        ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters.year ? { year: filters.year } : {}),
      },
    });
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      leaveTypeId: r.leaveTypeId,
      year: r.year,
      entitled: Number(r.entitled),
      taken: Number(r.taken),
      remaining: Number(r.entitled) - Number(r.taken),
    }));
  }

  // ---- Employment contracts ----

  async createContract(
    dto: CreateEmploymentContractDto,
  ): Promise<EmploymentContractDto> {
    const entity = this.contractRepo.create({
      employeeId: dto.employeeId,
      type: dto.type,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      jobTitle: dto.jobTitle,
      baseSalary: dto.baseSalary,
      status: dto.status ?? EmploymentContractStatus.ACTIVE,
      documentUrl: dto.documentUrl ?? null,
    });
    return this.toContractDto(await this.contractRepo.save(entity));
  }

  async findAllContracts(
    employeeId?: string,
  ): Promise<EmploymentContractDto[]> {
    const rows = await this.contractRepo.find({
      where: employeeId ? { employeeId } : {},
      order: { startDate: 'DESC' },
    });
    return rows.map((r) => this.toContractDto(r));
  }

  async updateContract(
    id: string,
    dto: UpdateEmploymentContractDto,
  ): Promise<EmploymentContractDto> {
    const entity = await this.contractRepo.findOne({ where: { id } });
    if (!entity)
      throw new NotFoundException(`Employment contract ${id} not found`);
    Object.assign(entity, dto);
    return this.toContractDto(await this.contractRepo.save(entity));
  }

  // ---- Performance reviews ----

  async createReview(
    dto: CreatePerformanceReviewDto,
  ): Promise<PerformanceReviewDto> {
    const entity = this.reviewRepo.create({
      employeeId: dto.employeeId,
      reviewerId: dto.reviewerId,
      reviewDate: dto.reviewDate,
      rating: dto.rating,
      strengths: dto.strengths ?? null,
      areasForImprovement: dto.areasForImprovement ?? null,
      comments: dto.comments ?? null,
      status: dto.status ?? PerformanceReviewStatus.DRAFT,
    });
    return this.toReviewDto(await this.reviewRepo.save(entity));
  }

  async findAllReviews(employeeId?: string): Promise<PerformanceReviewDto[]> {
    const rows = await this.reviewRepo.find({
      where: employeeId ? { employeeId } : {},
      order: { reviewDate: 'DESC' },
    });
    return rows.map((r) => this.toReviewDto(r));
  }

  async updateReview(
    id: string,
    dto: UpdatePerformanceReviewDto,
  ): Promise<PerformanceReviewDto> {
    const entity = await this.reviewRepo.findOne({ where: { id } });
    if (!entity)
      throw new NotFoundException(`Performance review ${id} not found`);
    Object.assign(entity, dto);
    return this.toReviewDto(await this.reviewRepo.save(entity));
  }

  // ---- Mapping ----

  private toLeaveTypeDto(e: LeaveType): LeaveTypeDto {
    return {
      id: e.id,
      nameAr: e.nameAr,
      nameEn: e.nameEn,
      defaultDaysPerYear: Number(e.defaultDaysPerYear),
      active: e.active,
    };
  }

  private toLeaveRequestDto(e: LeaveRequest): LeaveRequestDto {
    return {
      id: e.id,
      employeeId: e.employeeId,
      leaveTypeId: e.leaveTypeId,
      startDate: e.startDate,
      endDate: e.endDate,
      daysCount: Number(e.daysCount),
      status: e.status,
      approverId: e.approverId,
      reason: e.reason,
    };
  }

  private toContractDto(e: EmploymentContract): EmploymentContractDto {
    return {
      id: e.id,
      employeeId: e.employeeId,
      type: e.type,
      startDate: e.startDate,
      endDate: e.endDate,
      jobTitle: e.jobTitle,
      baseSalary: Number(e.baseSalary),
      status: e.status,
      documentUrl: e.documentUrl,
    };
  }

  private toReviewDto(e: PerformanceReview): PerformanceReviewDto {
    return {
      id: e.id,
      employeeId: e.employeeId,
      reviewerId: e.reviewerId,
      reviewDate: e.reviewDate,
      rating: e.rating,
      strengths: e.strengths,
      areasForImprovement: e.areasForImprovement,
      comments: e.comments,
      status: e.status,
    };
  }
}
