import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
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
  @ApiQuery({ name: 'companyId', required: true })
  getOrdersReport(
    @Query('companyId') companyId: string,
  ): Promise<OrdersReport> {
    return this.reportingService.getOrdersReport(companyId);
  }

  @Get('inventory')
  @ApiOperation({
    summary: 'Rapport stock : total, articles sous seuil, ruptures (TARHIB-10)',
  })
  @ApiQuery({ name: 'companyId', required: true })
  getInventoryReport(
    @Query('companyId') companyId: string,
  ): Promise<InventoryReport> {
    return this.reportingService.getInventoryReport(companyId);
  }

  @Get('sla')
  @ApiOperation({
    summary:
      'Rapport SLA : taux de conformité des délais de livraison (TARHIB-10)',
  })
  @ApiQuery({ name: 'companyId', required: true })
  getSlaReport(@Query('companyId') companyId: string): Promise<SlaReport> {
    return this.reportingService.getSlaReport(companyId);
  }
}
