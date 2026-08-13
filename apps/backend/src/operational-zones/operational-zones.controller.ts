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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import {
  assertResourceScope,
  constrainRequestedScope,
} from '../common/access/request-scope.js';
import {
  AssignOperationalZoneDto,
  CreateOperationalZoneDto,
  SetZoneAssignmentStatusDto,
} from './dto/operational-zone.dto.js';
import { OperationalZoneType } from './entities/operational-zone.entity.js';
import { OperationalZonesService } from './operational-zones.service.js';

@Controller('operational-zones')
export class OperationalZonesController {
  constructor(private readonly service: OperationalZonesService) {}

  @Get('mine')
  @RequireAnyPermission(
    'order.deliver',
    'order.queue.manage',
    'cleaning.task.complete',
    'cleaning.task.manage',
  )
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.mine(user.employeeId ?? user.sub);
  }

  @Get()
  @RequireAnyPermission('order.queue.manage', 'cleaning.task.manage')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('type') type?: OperationalZoneType,
  ) {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    return this.service.findAll({ ...scope, ...(type ? { type } : {}) });
  }

  @Post()
  @RequireAnyPermission('order.queue.manage', 'cleaning.task.manage')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOperationalZoneDto,
  ) {
    assertResourceScope(user, dto);
    this.assertCanManageType(user, dto.type);
    return this.service.create(dto);
  }

  @Post(':id/assignments')
  @RequireAnyPermission('order.queue.manage', 'cleaning.task.manage')
  async assign(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignOperationalZoneDto,
  ) {
    const zone = await this.service.findOne(id);
    assertResourceScope(user, zone);
    this.assertCanManageType(user, zone.type);
    return this.service.assign(
      id,
      dto.employeeId,
      user.employeeId ?? user.sub,
      dto.startsAt ? new Date(dto.startsAt) : new Date(),
      dto.endsAt ? new Date(dto.endsAt) : null,
    );
  }

  @Get(':id/assignments')
  @RequireAnyPermission('order.queue.manage', 'cleaning.task.manage')
  async assignments(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const zone = await this.service.findOne(id);
    assertResourceScope(user, zone);
    this.assertCanManageType(user, zone.type);
    return this.service.findAssignments(id);
  }

  @Patch('assignments/:id/status')
  @RequireAnyPermission('order.queue.manage', 'cleaning.task.manage')
  async setAssignmentStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetZoneAssignmentStatusDto,
  ) {
    const assignment = await this.service.findAssignment(id);
    const zone = await this.service.findOne(assignment.zoneId);
    assertResourceScope(user, zone);
    this.assertCanManageType(user, zone.type);
    return this.service.setAssignmentActive(id, dto.active);
  }

  private assertCanManageType(user: JwtPayload, type: OperationalZoneType) {
    const permission =
      type === OperationalZoneType.DELIVERY
        ? 'order.queue.manage'
        : 'cleaning.task.manage';
    if (!user.permissions.includes(permission)) {
      throw new ForbiddenException('operationalZoneTypeNotAllowed');
    }
  }
}
