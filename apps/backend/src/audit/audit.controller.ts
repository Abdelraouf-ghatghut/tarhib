import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import { AuditService } from './audit.service.js';
import { AuditLogDto } from './dto/audit-log.dto.js';

// Filtrage backend obligatoire (§4 CLAUDE.md) — la page web-admin masquait
// déjà "Audit" côté UI pour qui n'a pas company.manage, mais rien ne
// bloquait cet endpoint côté API (n'importe quel compte TARHIB authentifié
// pouvait lire tous les logs d'audit — IP, actions d'autres utilisateurs).
@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequireAnyPermission('company.manage')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: "Logs d'audit — lecture seule (admins)" })
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'startDate', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [AuditLogDto] })
  findAll(
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: AuditLogDto[]; total: number }> {
    return this.auditService.findAll({
      entity,
      userId,
      entityId,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
