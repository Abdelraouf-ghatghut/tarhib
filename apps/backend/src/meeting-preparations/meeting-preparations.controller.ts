import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import {
  assertResourceScope,
  constrainRequestedScope,
} from '../common/access/request-scope.js';
import { AssignMeetingPreparationDto } from './dto/assign-meeting-preparation.dto.js';
import { UpdateMeetingPreparationTeamDto } from './dto/update-meeting-preparation-team.dto.js';
import { MeetingPreparationStatus } from './entities/meeting-preparation.entity.js';
import { MeetingPreparationsService } from './meeting-preparations.service.js';

@Controller('meeting-preparations')
export class MeetingPreparationsController {
  constructor(private readonly service: MeetingPreparationsService) {}

  @Get()
  @RequireAnyPermission(
    'meeting.preparation.view',
    'meeting.preparation.execute',
    'meeting.preparation.manage',
  )
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ) {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    const tasks = await this.service.list(scope.companyId, scope.branchId);
    if (this.isManager(user)) return tasks;

    // Un exécutant ne reçoit que les préparations dont il est responsable ou
    // membre d'équipe. Ce filtrage backend protège aussi les agrégats du Web
    // Admin : masquer un widget côté React ne constitue jamais une autorisation.
    const employeeId = user.employeeId ?? user.sub;
    return tasks.filter(
      (task) =>
        task.assignedEmployeeId === employeeId ||
        task.participantEmployeeIds.includes(employeeId),
    );
  }

  @Patch(':id/assign')
  @RequireAnyPermission('meeting.preparation.manage')
  async assign(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignMeetingPreparationDto,
  ) {
    await this.assertScope(user, id);
    return this.service.assign(id, dto.employeeId);
  }

  @Patch(':id/team')
  @RequireAnyPermission(
    'meeting.preparation.execute',
    'meeting.preparation.manage',
  )
  async setTeam(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMeetingPreparationTeamDto,
  ) {
    await this.assertScope(user, id);
    return this.service.setTeam(
      id,
      user.employeeId ?? user.sub,
      dto.participantEmployeeIds,
      this.isManager(user),
    );
  }

  @Patch(':id/start')
  @RequireAnyPermission(
    'meeting.preparation.execute',
    'meeting.preparation.manage',
  )
  async start(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.assertScope(user, id);
    return this.service.start(
      id,
      user.employeeId ?? user.sub,
      this.isManager(user),
    );
  }

  @Patch(':id/checklist/:key')
  @RequireAnyPermission(
    'meeting.preparation.execute',
    'meeting.preparation.manage',
  )
  async toggle(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('key') key: string,
  ) {
    await this.assertScope(user, id);
    return this.service.toggle(
      id,
      key,
      user.employeeId ?? user.sub,
      this.isManager(user),
    );
  }

  @Patch(':id/ready')
  @RequireAnyPermission(
    'meeting.preparation.execute',
    'meeting.preparation.manage',
  )
  async ready(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.assertScope(user, id);
    return this.service.transition(
      id,
      MeetingPreparationStatus.READY,
      user.employeeId ?? user.sub,
      this.isManager(user),
    );
  }

  @Patch(':id/complete')
  @RequireAnyPermission(
    'meeting.preparation.execute',
    'meeting.preparation.manage',
  )
  async complete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.assertScope(user, id);
    return this.service.transition(
      id,
      MeetingPreparationStatus.COMPLETED,
      user.employeeId ?? user.sub,
      this.isManager(user),
    );
  }

  @Patch(':id/verify')
  @RequireAnyPermission('meeting.preparation.manage')
  async verify(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.assertScope(user, id);
    return this.service.transition(
      id,
      MeetingPreparationStatus.VERIFIED,
      user.employeeId ?? user.sub,
      true,
    );
  }

  private isManager(user: JwtPayload): boolean {
    return user.permissions.includes('meeting.preparation.manage');
  }

  private async assertScope(user: JwtPayload, id: string): Promise<void> {
    assertResourceScope(user, await this.service.one(id));
  }
}
