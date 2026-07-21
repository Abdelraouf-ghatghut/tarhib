import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { AccessPolicyService } from '../access/access-policy.service.js';
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import { constrainRequestedScope } from '../common/access/request-scope.js';
import {
  CleaningTask,
  CleaningTaskStatus,
} from '../cleaning-tasks/entities/cleaning-task.entity.js';
import {
  MeetingPreparation,
  MeetingPreparationStatus,
} from '../meeting-preparations/entities/meeting-preparation.entity.js';

@ApiTags('operations')
@ApiBearerAuth()
@Controller('operations')
export class OperationsController {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(CleaningTask)
    private readonly cleaningTaskRepo: Repository<CleaningTask>,
    @InjectRepository(MeetingPreparation)
    private readonly meetingPreparationRepo: Repository<MeetingPreparation>,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Current Tarhib operations profile, roles and modules',
  })
  async me(@CurrentUser() user: JwtPayload) {
    const employee = await this.findEmployee(user);
    return this.accessPolicy.resolve(employee);
  }

  @Get('capabilities')
  @ApiOperation({ summary: 'Current Tarhib operations capabilities only' })
  async capabilities(@CurrentUser() user: JwtPayload) {
    const employee = await this.findEmployee(user);
    const access = await this.accessPolicy.resolve(employee);
    return {
      capabilities: access.capabilities,
      modules: access.modules,
      permissions: access.permissions,
      dataScope: access.dataScope,
    };
  }

  @Get('team')
  @RequireAnyPermission(
    'cleaning.task.assign',
    'cleaning.task.manage',
    'meeting.preparation.manage',
    'employee.manage',
  )
  @ApiOperation({ summary: 'Assignable branch employees with active workload' })
  async team(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ) {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    const employees = await this.employeeRepo.find({
      where: {
        ...(scope.companyId ? { companyId: scope.companyId } : {}),
        ...(scope.branchId ? { branchId: scope.branchId } : {}),
        active: true,
      },
      order: { firstNameEn: 'ASC', firstNameAr: 'ASC' },
    });
    const ids = employees.map((employee) => employee.id);
    if (!ids.length) return [];
    const [cleaningCounts, meetingCounts] = await Promise.all([
      this.cleaningTaskRepo
        .createQueryBuilder('task')
        .select('task.assignedEmployeeId', 'employeeId')
        .addSelect('COUNT(*)', 'count')
        .where('task.assignedEmployeeId IN (:...ids)', { ids })
        .andWhere('task.status IN (:...statuses)', {
          statuses: [
            CleaningTaskStatus.ASSIGNED,
            CleaningTaskStatus.IN_PROGRESS,
          ],
        })
        .groupBy('task.assignedEmployeeId')
        .getRawMany<{ employeeId: string; count: string }>(),
      this.meetingPreparationRepo
        .createQueryBuilder('task')
        .select('task.assignedEmployeeId', 'employeeId')
        .addSelect('COUNT(*)', 'count')
        .where('task.assignedEmployeeId IN (:...ids)', { ids })
        .andWhere('task.status IN (:...statuses)', {
          statuses: [
            MeetingPreparationStatus.ASSIGNED,
            MeetingPreparationStatus.IN_PROGRESS,
            MeetingPreparationStatus.READY,
          ],
        })
        .groupBy('task.assignedEmployeeId')
        .getRawMany<{ employeeId: string; count: string }>(),
    ]);
    const workload = new Map<string, number>();
    for (const row of [...cleaningCounts, ...meetingCounts]) {
      workload.set(
        row.employeeId,
        (workload.get(row.employeeId) ?? 0) + Number(row.count),
      );
    }
    return employees.map((employee) => ({
      id: employee.id,
      firstNameAr: employee.firstNameAr,
      firstNameEn: employee.firstNameEn,
      lastNameAr: employee.lastNameAr,
      lastNameEn: employee.lastNameEn,
      branchId: employee.branchId,
      activeTaskCount: workload.get(employee.id) ?? 0,
    }));
  }

  private async findEmployee(user: JwtPayload): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: [{ keycloakId: user.sub }, { id: user.sub }],
      relations: ['additionalRoles', 'company', 'branch'],
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }
}
