import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { RolesService } from './roles.service.js';
import {
  CreateRoleDto,
  CreateRoleQuotaDto,
  UpdateRoleDto,
} from './dto/role.dto.js';

@ApiTags('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @RequirePermission('role.manage')
  findAll(@CurrentUser() caller: JwtPayload) {
    return this.service.findAll(caller);
  }

  @Get(':id')
  @RequirePermission('role.manage')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission('role.manage')
  create(@Body() dto: CreateRoleDto, @CurrentUser() caller: JwtPayload) {
    return this.service.create(dto, caller);
  }

  @Patch(':id')
  @RequirePermission('role.manage')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('role.manage')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/quotas')
  @RequirePermission('role.manage')
  setQuota(
    @Param('id') roleId: string,
    @Body() dto: CreateRoleQuotaDto,
    @CurrentUser() caller: JwtPayload,
  ) {
    return this.service.setQuota(roleId, caller.companyId, dto);
  }

  @Get(':id/quotas')
  @RequirePermission('role.manage')
  getQuotas(@Param('id') roleId: string) {
    return this.service.getQuotas(roleId);
  }

  @Delete(':id/quotas/:quotaId')
  @RequirePermission('role.manage')
  @HttpCode(204)
  removeQuota(@Param('id') roleId: string, @Param('quotaId') quotaId: string) {
    return this.service.removeQuota(roleId, quotaId);
  }
}
