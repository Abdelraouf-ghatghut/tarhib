import { Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { NotificationsService } from './notifications.service.js';
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}
  @Get() list(@CurrentUser() u: JwtPayload) {
    return this.service.listForUser(u);
  }
  @Patch(':id/read') read(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.service.markRead(id, u);
  }
  @Patch('read-all') readAll(@CurrentUser() u: JwtPayload) {
    return this.service.markAllRead(u);
  }
}
