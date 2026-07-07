import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';
import { PrioritySlaService } from './priority-sla.service.js';
import { UpsertSlaLevelsDto } from './dto/sla-level.dto.js';

@ApiTags('sla-levels')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sla-levels')
export class PrioritySlaController {
  constructor(private readonly service: PrioritySlaService) {}

  @Get()
  @RequirePermission('role.manage')
  getLevels(@Query('companyId', ParseUUIDPipe) companyId: string) {
    return this.service.getLevels(companyId);
  }

  @Put(':companyId')
  @RequirePermission('role.manage')
  setLevels(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: UpsertSlaLevelsDto,
  ) {
    return this.service.setLevels(companyId, dto);
  }
}
