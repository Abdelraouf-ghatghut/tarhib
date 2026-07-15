import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import {
  assertResourceScope,
  constrainRequestedScope,
} from '../common/access/request-scope.js';
import {
  CleaningTask,
  CleaningTaskStatus,
} from './entities/cleaning-task.entity.js';
import { CleaningTasksService } from './cleaning-tasks.service.js';
import {
  AssignCleaningTaskDto,
  CreateCleaningTaskDto,
} from './dto/cleaning-task.dto.js';

@ApiTags('cleaning-tasks')
@ApiBearerAuth()
@Controller('cleaning/tasks')
export class CleaningTasksController {
  constructor(private readonly service: CleaningTasksService) {}

  @Get()
  @RequireAnyPermission('cleaning.task.view', 'cleaning.task.manage')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ) {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    const ownOnly =
      !user.permissions.includes('cleaning.task.manage') &&
      !user.permissions.includes('cleaning.task.assign');
    return this.service.findAll({
      ...scope,
      assignedEmployeeId: ownOnly ? (user.employeeId ?? user.sub) : undefined,
    });
  }

  @Post()
  @RequireAnyPermission('cleaning.task.manage')
  create(@CurrentUser() user: JwtPayload, @Body() body: CreateCleaningTaskDto) {
    assertResourceScope(user, {
      companyId: body.companyId,
      branchId: body.branchId,
    });
    return this.service.create({
      ...body,
      status: body.assignedEmployeeId
        ? CleaningTaskStatus.ASSIGNED
        : CleaningTaskStatus.PENDING,
    });
  }

  @Patch(':id/assign')
  @RequireAnyPermission('cleaning.task.assign', 'cleaning.task.manage')
  async assign(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignCleaningTaskDto,
  ) {
    const task = await this.service.findOne(id);
    assertResourceScope(user, task);
    return this.service.assign(id, dto.employeeId);
  }

  @Patch(':id/start')
  @RequireAnyPermission('cleaning.task.complete', 'cleaning.task.manage')
  async start(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const task = await this.service.findOne(id);
    assertResourceScope(user, task);
    this.assertAssignee(user, task);
    return this.service.transition(
      id,
      CleaningTaskStatus.IN_PROGRESS,
      user.employeeId ?? user.sub,
    );
  }

  @Patch(':id/complete')
  @RequireAnyPermission('cleaning.task.complete', 'cleaning.task.manage')
  async complete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const task = await this.service.findOne(id);
    assertResourceScope(user, task);
    this.assertAssignee(user, task);
    return this.service.transition(
      id,
      CleaningTaskStatus.DONE,
      user.employeeId ?? user.sub,
    );
  }

  @Patch(':id/verify')
  @RequireAnyPermission('cleaning.task.manage')
  async verify(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const task = await this.service.findOne(id);
    assertResourceScope(user, task);
    return this.service.transition(
      id,
      CleaningTaskStatus.VERIFIED,
      user.employeeId ?? user.sub,
    );
  }

  private assertAssignee(user: JwtPayload, task: CleaningTask): void {
    if (user.permissions.includes('cleaning.task.manage')) return;
    if (task.assignedEmployeeId !== (user.employeeId ?? user.sub)) {
      throw new ForbiddenException(
        'Cleaning task is not assigned to the current employee',
      );
    }
  }
}
