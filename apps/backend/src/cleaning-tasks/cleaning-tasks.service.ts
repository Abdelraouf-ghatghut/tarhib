import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  CleaningTask,
  CleaningTaskStatus,
} from './entities/cleaning-task.entity.js';

@Injectable()
export class CleaningTasksService {
  constructor(
    @InjectRepository(CleaningTask)
    private readonly repo: Repository<CleaningTask>,
  ) {}

  findAll(filters: {
    companyId?: string;
    branchId?: string;
    assignedEmployeeId?: string;
  }): Promise<CleaningTask[]> {
    const where: FindOptionsWhere<CleaningTask> = {};
    Object.assign(
      where,
      Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
    );
    return this.repo.find({
      where,
      order: { dueDate: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CleaningTask> {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Cleaning task ${id} not found`);
    return task;
  }

  create(input: Partial<CleaningTask>): Promise<CleaningTask> {
    return this.repo.save(this.repo.create(input));
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
