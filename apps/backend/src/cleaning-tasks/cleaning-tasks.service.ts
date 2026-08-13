import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
import {
  CleaningTask,
  CleaningTaskStatus,
} from './entities/cleaning-task.entity.js';
import { OperationalZonesService } from '../operational-zones/operational-zones.service.js';
import { OperationalZoneType } from '../operational-zones/entities/operational-zone.entity.js';

@Injectable()
export class CleaningTasksService {
  constructor(
    @InjectRepository(CleaningTask)
    private readonly repo: Repository<CleaningTask>,
    private readonly operationalZones: OperationalZonesService,
  ) {}

  findAll(filters: {
    companyId?: string;
    branchId?: string;
    assignedEmployeeId?: string;
    operationalZoneIds?: string[];
  }): Promise<CleaningTask[]> {
    const where: FindOptionsWhere<CleaningTask> = {};
    Object.assign(
      where,
      Object.fromEntries(
        Object.entries(filters)
          .filter(([key, value]) => key !== 'operationalZoneIds' && value)
          .map(([key, value]) => [key, value]),
      ),
    );
    const zoneIds = filters.operationalZoneIds ?? [];
    const scopedWhere:
      | FindOptionsWhere<CleaningTask>[]
      | FindOptionsWhere<CleaningTask> =
      filters.assignedEmployeeId && zoneIds.length
        ? [
            where,
            {
              ...where,
              assignedEmployeeId: IsNull(),
              operationalZoneId: In(zoneIds),
            },
          ]
        : where;
    return this.repo.find({
      where: scopedWhere,
      order: { dueDate: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CleaningTask> {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Cleaning task ${id} not found`);
    return task;
  }

  async create(input: Partial<CleaningTask>): Promise<CleaningTask> {
    if (input.operationalZoneId) {
      const zone = await this.operationalZones.findOne(input.operationalZoneId);
      if (
        zone.type !== OperationalZoneType.CLEANING ||
        zone.companyId !== input.companyId ||
        zone.branchId !== input.branchId ||
        (input.floor &&
          !zone.floors.some(
            (floor) =>
              this.operationalZones.floorKey(floor) ===
              this.operationalZones.floorKey(input.floor!),
          ))
      ) {
        throw new BadRequestException('cleaningTaskOutsideSelectedZone');
      }
    }
    return this.repo.save(this.repo.create(input));
  }

  async claimAndStart(
    id: string,
    employeeId: string,
    allowedZoneIds: string[],
  ): Promise<CleaningTask> {
    if (!allowedZoneIds.length) {
      throw new BadRequestException('cleaningZoneAssignmentRequired');
    }
    const result = await this.repo
      .createQueryBuilder()
      .update(CleaningTask)
      .set({
        assignedEmployeeId: employeeId,
        status: CleaningTaskStatus.IN_PROGRESS,
      })
      .where('id = :id', { id })
      .andWhere('status = :status', { status: CleaningTaskStatus.PENDING })
      .andWhere('assigned_employee_id IS NULL')
      .andWhere('operational_zone_id IN (:...zoneIds)', {
        zoneIds: allowedZoneIds,
      })
      .execute();
    if (result.affected !== 1) {
      throw new BadRequestException('cleaningTaskAlreadyClaimedOrOutsideZone');
    }
    return this.findOne(id);
  }

  async assign(id: string, employeeId: string): Promise<CleaningTask> {
    const task = await this.findOne(id);
    if (
      [
        CleaningTaskStatus.DONE,
        CleaningTaskStatus.VERIFIED,
        CleaningTaskStatus.CANCELLED,
      ].includes(task.status)
    ) {
      throw new BadRequestException('completedCleaningTaskCannotBeAssigned');
    }
    task.assignedEmployeeId = employeeId;
    task.status = CleaningTaskStatus.ASSIGNED;
    return this.repo.save(task);
  }

  async transition(
    id: string,
    status: CleaningTaskStatus,
    employeeId: string,
  ): Promise<CleaningTask> {
    const task = await this.findOne(id);
    const allowed: Record<CleaningTaskStatus, CleaningTaskStatus[]> = {
      PENDING: [CleaningTaskStatus.ASSIGNED, CleaningTaskStatus.CANCELLED],
      ASSIGNED: [
        CleaningTaskStatus.IN_PROGRESS,
        CleaningTaskStatus.PENDING,
        CleaningTaskStatus.CANCELLED,
      ],
      IN_PROGRESS: [CleaningTaskStatus.DONE, CleaningTaskStatus.CANCELLED],
      DONE: [CleaningTaskStatus.VERIFIED, CleaningTaskStatus.IN_PROGRESS],
      VERIFIED: [],
      CANCELLED: [],
    };
    if (!allowed[task.status].includes(status))
      throw new BadRequestException(
        `Invalid cleaning transition ${task.status} -> ${status}`,
      );
    task.status = status;
    if (status === CleaningTaskStatus.DONE) task.completedAt = new Date();
    if (status === CleaningTaskStatus.VERIFIED) {
      task.verifiedByEmployeeId = employeeId;
      task.verifiedAt = new Date();
    }
    return this.repo.save(task);
  }
}
