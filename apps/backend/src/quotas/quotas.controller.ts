import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { constrainRequestedScope } from '../common/access/request-scope.js';
import { parsePagination } from '../common/pagination.js';
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import { CreateQuotaDto, QuotaDto, UpdateQuotaDto } from './dto/quota.dto.js';
import { QuotasService } from './quotas.service.js';

// Gestion des quotas individuels — usage interne (aucun endpoint self-service
// employé ici), même garde que branches/departments (§4 CLAUDE.md).
@ApiTags('quotas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequireAnyPermission('company.manage', 'branch.manage')
@Controller('quotas')
export class QuotasController {
  constructor(private readonly quotasService: QuotasService) {}

  // Quota n'a pas de branchId : la portée est limitée à la société.
  private assertCompanyScope(user: JwtPayload, companyId: string): void {
    if (user.dataScope !== 'GLOBAL' && companyId !== user.companyId) {
      throw new ForbiddenException(
        'Resource company is outside the current data scope',
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Définir un quota produit pour un employé' })
  @ApiResponse({ status: 201, type: QuotaDto })
  create(@Body() dto: CreateQuotaDto): Promise<QuotaDto> {
    return this.quotasService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lister les quotas (filtrable par companyId / employeeId)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'page', required: false, description: 'Défaut 1' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Défaut 200, max 500',
  })
  @ApiResponse({ status: 200, type: [QuotaDto] })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<QuotaDto[]> {
    const scope = constrainRequestedScope(user, { companyId });
    const { skip, limit: take } = parsePagination(page, limit);
    return this.quotasService.findAll(scope.companyId, employeeId, skip, take);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un quota par ID' })
  @ApiResponse({ status: 200, type: QuotaDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<QuotaDto> {
    const quota = await this.quotasService.findOne(id);
    this.assertCompanyScope(user, quota.companyId);
    return quota;
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier un quota (produit, période, quantité maximale)',
  })
  @ApiResponse({ status: 200, type: QuotaDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuotaDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<QuotaDto> {
    const quota = await this.quotasService.findOne(id);
    this.assertCompanyScope(user, quota.companyId);
    return this.quotasService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprimer un quota' })
  @ApiResponse({ status: 204 })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    const quota = await this.quotasService.findOne(id);
    this.assertCompanyScope(user, quota.companyId);
    return this.quotasService.remove(id);
  }
}
