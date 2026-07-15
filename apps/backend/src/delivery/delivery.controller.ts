import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import {
  assertResourceScope,
  constrainRequestedScope,
} from '../common/access/request-scope.js';
import { DeliveryService } from './delivery.service.js';
import { DeliveryTaskStatus } from './entities/delivery-task.entity.js';
import { DeliveryIssueDto } from './dto/delivery-issue.dto.js';

@ApiTags('delivery')
@ApiBearerAuth()
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}

  @Get('queue')
  @RequireAnyPermission(
    'order.delivery.queue.view',
    'order.deliver',
    'order.queue.view',
  )
  queue(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ) {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    return this.service.queue(scope.companyId, scope.branchId);
  }

  @Patch('tasks/:id/accept')
  @RequireAnyPermission('order.deliver')
  accept(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scopedTransition(id, DeliveryTaskStatus.ASSIGNED, user);
  }
  @Patch('tasks/:id/pickup')
  @RequireAnyPermission('order.deliver')
  pickup(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scopedTransition(id, DeliveryTaskStatus.PICKED_UP, user);
  }
  @Patch('tasks/:id/depart')
  @RequireAnyPermission('order.deliver')
  depart(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scopedTransition(id, DeliveryTaskStatus.OUT_FOR_DELIVERY, user);
  }
  @Patch('tasks/:id/deliver')
  @RequireAnyPermission('order.deliver')
  deliver(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scopedTransition(id, DeliveryTaskStatus.DELIVERED, user);
  }
  @Patch('tasks/:id/issue')
  @RequireAnyPermission('order.deliver')
  issue(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: DeliveryIssueDto,
  ) {
    return this.scopedTransition(
      id,
      DeliveryTaskStatus.ISSUE_REPORTED,
      user,
      dto.reason,
    );
  }
  @Patch('tasks/:id/resume')
  @RequireAnyPermission('order.queue.manage')
  resume(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scopedTransition(id, DeliveryTaskStatus.OUT_FOR_DELIVERY, user);
  }
  @Patch('tasks/:id/return')
  @RequireAnyPermission('order.queue.manage')
  returnToBranch(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scopedTransition(id, DeliveryTaskStatus.RETURNED, user);
  }
  @Patch('tasks/:id/fail')
  @RequireAnyPermission('order.queue.manage')
  fail(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scopedTransition(id, DeliveryTaskStatus.FAILED, user);
  }

  private async scopedTransition(
    id: string,
    status: DeliveryTaskStatus,
    user: JwtPayload,
    reason?: string,
  ) {
    const task = await this.service.findOne(id);
    assertResourceScope(user, task);
    return this.service.transitionAtomic(id, status, user, reason);
  }
}
