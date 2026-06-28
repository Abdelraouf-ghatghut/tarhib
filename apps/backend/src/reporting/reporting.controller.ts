import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import {
  InventoryReport,
  OrdersReport,
  ReportingService,
  SlaReport,
} from './reporting.service.js';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('orders')
  @ApiOperation({
    summary:
      'Rapport commandes : total, par statut et par priorité (TARHIB-10)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  getOrdersReport(
    @Req() req: Request & { user: JwtPayload },
    @Query('companyId') qCompanyId?: string,
  ): Promise<OrdersReport> {
    const companyId = req.user?.companyId || qCompanyId || '';
    return this.reportingService.getOrdersReport(companyId);
  }

  @Get('inventory')
  @ApiOperation({
    summary: 'Rapport stock : total, articles sous seuil, ruptures (TARHIB-10)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  getInventoryReport(
    @Req() req: Request & { user: JwtPayload },
    @Query('companyId') qCompanyId?: string,
  ): Promise<InventoryReport> {
    const companyId = req.user?.companyId || qCompanyId || '';
    return this.reportingService.getInventoryReport(companyId);
  }

  @Get('sla')
  @ApiOperation({
    summary:
      'Rapport SLA : taux de conformité des délais de livraison (TARHIB-10)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  getSlaReport(
    @Req() req: Request & { user: JwtPayload },
    @Query('companyId') qCompanyId?: string,
  ): Promise<SlaReport> {
    const companyId = req.user?.companyId || qCompanyId || '';
    return this.reportingService.getSlaReport(companyId);
  }
}
