import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import {
  ExecutiveReport,
  InventoryDetailReport,
  InventoryReport,
  MeetingRoomsReport,
  OrdersReport,
  PurchasingReport,
  QuotaReport,
  ReportingService,
  SlaReport,
  UserActivityReport,
} from './reporting.service.js';

// Filtrage backend obligatoire (§4 CLAUDE.md) — la page web-admin masque déjà
// "Reports" côté UI pour qui n'a pas report.view, mais rien ne bloquait ces
// endpoints côté API avant ce guard (n'importe quel compte TARHIB authentifié
// pouvait les appeler directement).
@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequireAnyPermission('report.view', 'company.manage', 'branch.manage')
@Controller('reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('orders')
  @ApiOperation({
    summary: 'Rapport commandes : total, par statut et par priorité',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'ISO date (inclusive)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'ISO date (inclusive)',
  })
  getOrdersReport(
    @Req() req: Request & { user: JwtPayload },
    @Query('companyId') qCompanyId?: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<OrdersReport> {
    const companyId = req.user?.companyId || qCompanyId || '';
    return this.reportingService.getOrdersReport(companyId, {
      branchId,
      from,
      to,
    });
  }

  @Get('inventory')
  @ApiOperation({
    summary: 'Rapport stock : total, articles sous seuil, ruptures',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  getInventoryReport(
    @Req() req: Request & { user: JwtPayload },
    @Query('companyId') qCompanyId?: string,
    @Query('branchId') branchId?: string,
  ): Promise<InventoryReport> {
    const companyId = req.user?.companyId || qCompanyId || '';
    return this.reportingService.getInventoryReport(companyId, { branchId });
  }

  @Get('sla')
  @ApiOperation({
    summary: 'Rapport SLA : taux de conformité des délais de livraison',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getSlaReport(
    @Req() req: Request & { user: JwtPayload },
    @Query('companyId') qCompanyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<SlaReport> {
    const companyId = req.user?.companyId || qCompanyId || '';
    return this.reportingService.getSlaReport(companyId, { from, to });
  }

  @Get('quotas')
  @ApiOperation({
    summary:
      'Rapport quotas : taux de consommation moyen, produits/employés proches du plafond',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  getQuotaReport(
    @Req() req: Request & { user: JwtPayload },
    @Query('companyId') qCompanyId?: string,
    @Query('branchId') branchId?: string,
  ): Promise<QuotaReport> {
    const companyId = req.user?.companyId || qCompanyId || '';
    return this.reportingService.getQuotaReport(companyId, { branchId });
  }

  @Get('user-activity')
  @ApiOperation({
    summary:
      'Rapport activité utilisateurs : top employés, répartition par branche',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getUserActivityReport(
    @Req() req: Request & { user: JwtPayload },
    @Query('companyId') qCompanyId?: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ): Promise<UserActivityReport> {
    const companyId = req.user?.companyId || qCompanyId || '';
    return this.reportingService.getUserActivityReport(companyId, {
      branchId,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('meeting-rooms')
  @ApiOperation({
    summary:
      'Rapport salles de réunion : bookings, taux annulation, durée moyenne',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getMeetingRoomsReport(
    @Req() req: Request & { user: JwtPayload },
    @Query('companyId') qCompanyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<MeetingRoomsReport> {
    const companyId = req.user?.companyId || qCompanyId || '';
    return this.reportingService.getMeetingRoomsReport(companyId, { from, to });
  }

  @Get('purchasing')
  @RequireAnyPermission('procurement.cost.view', 'company.manage')
  @ApiOperation({
    summary:
      'Rapport financier achats : dépenses par produit et par fournisseur (achats Tarhib, companyId/branchId = lieu de livraison, filtre optionnel) — permission dédiée, données monétaires jamais visibles avec le seul report.view',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getPurchasingReport(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('productId') productId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<PurchasingReport> {
    return this.reportingService.getPurchasingReport({
      companyId,
      branchId,
      supplierId,
      productId,
      from,
      to,
    });
  }

  @Get('inventory-detail')
  @RequireAnyPermission('procurement.cost.view', 'company.manage')
  @ApiOperation({
    summary:
      'Rapport détaillé stock : quantité et valeur par produit, par produit+branche, et détail par emplacement — permission dédiée (contient unitCost/stockValue)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'zone', required: false })
  @ApiQuery({ name: 'belowThresholdOnly', required: false })
  getInventoryDetailReport(
    @Req() req: Request & { user: JwtPayload },
    @Query('companyId') qCompanyId?: string,
    @Query('branchId') branchId?: string,
    @Query('productId') productId?: string,
    @Query('zone') zone?: string,
    @Query('belowThresholdOnly') belowThresholdOnly?: string,
  ): Promise<InventoryDetailReport> {
    const companyId = req.user?.companyId || qCompanyId || '';
    return this.reportingService.getInventoryDetailReport({
      companyId,
      branchId,
      productId,
      zone,
      belowThresholdOnly: belowThresholdOnly === 'true',
    });
  }

  @Get('executive')
  @ApiOperation({
    summary:
      "Vue exécutive : KPI et tendances globales (sociétés, commandes, SLA, stock, achats) — vue interne Tarhib, société/branche facultatives. Les indicateurs monétaires (valeur du stock, ruptures, dépenses achats) sont retirés de la réponse si l'appelant n'a pas procurement.cost.view, même règle que /reports/purchasing et /reports/inventory-detail.",
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({
    name: 'granularity',
    required: false,
    enum: ['day', 'week', 'month', 'year'],
  })
  async getExecutiveReport(
    @Req() req: Request & { user: JwtPayload },
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: 'day' | 'week' | 'month' | 'year',
  ): Promise<ExecutiveReport> {
    const report = await this.reportingService.getExecutiveReport({
      companyId,
      branchId,
      from,
      to,
      granularity,
    });
    const canViewCosts =
      req.user?.permissions?.includes('procurement.cost.view') ||
      req.user?.permissions?.includes('company.manage');
    if (!canViewCosts) {
      report.kpis.totalStockValue = 0;
      report.kpis.outOfStockCount = 0;
      report.kpis.purchasingSpend = 0;
    }
    return report;
  }
}
