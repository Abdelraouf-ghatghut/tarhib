import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  RequireAnyPermission,
  RequirePermission,
} from '../auth/decorators/require-permission.decorator.js';
import {
  CreateBudgetDto,
  CreateCostSnapshotDto,
  CreateFeedbackDto,
  CreateInvoiceDto,
  GenerateForecastDto,
  RecordPaymentDto,
  SetAttendanceDto,
  SetBudgetStatusDto,
} from './dto/performance.dto.js';
import { ForecastKind } from './entities/performance.entities.js';
import { PerformanceManagementService } from './performance-management.service.js';
import { InvoicePdfService } from './invoice-pdf.service.js';

@ApiTags('performance-management')
@ApiBearerAuth()
@RequireAnyPermission(
  'finance.view',
  'finance.manage',
  'report.view',
  'company.manage',
)
@Controller('performance-management')
export class PerformanceManagementController {
  constructor(
    private readonly service: PerformanceManagementService,
    private readonly invoicePdf: InvoicePdfService,
  ) {}

  @Get('dashboard') dashboard(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.dashboard(from, to, companyId);
  }
  @Get('invoices') invoices(@Query('companyId') companyId?: string) {
    return this.service.listInvoices(companyId);
  }
  @Get('invoices/:id/pdf')
  async invoicePdfDocument(
    @Param('id') id: string,
    @Query('language') language: string | undefined,
    @Req() req: Request & { user: JwtPayload },
    @Res({ passthrough: true }) response: Response,
  ) {
    const document = await this.invoicePdf.getOrGenerate(
      id,
      language ?? 'en',
      req.user.sub,
    );
    response.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename="${document.fileName}"`,
      'X-Document-SHA256': document.sha256,
    });
    return new StreamableFile(document.content);
  }
  @Post('invoices') @RequirePermission('finance.manage') createInvoice(
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.service.createInvoice(dto);
  }
  @Post('invoices/:id/issue') @RequirePermission('finance.manage') issueInvoice(
    @Param('id') id: string,
  ) {
    return this.service.issueInvoice(id);
  }
  @Post('invoices/:id/payments') @RequirePermission('finance.manage') payment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.service.recordPayment(id, dto);
  }
  @Post('revenue-recognition/run')
  @RequirePermission('finance.manage')
  recognizeRevenue(@Query('asOf') asOf?: string) {
    return this.service.recognizeRevenue(
      asOf ?? new Date().toISOString().slice(0, 10),
    );
  }

  @Get('budgets') budgets(@Query('year') year?: string) {
    return this.service.listBudgets(year ? Number(year) : undefined);
  }
  @Post('budgets') @RequirePermission('finance.manage') createBudget(
    @Body() dto: CreateBudgetDto,
  ) {
    return this.service.createBudget(dto);
  }
  @Patch('budgets/:id/status')
  @RequirePermission('finance.manage')
  budgetStatus(@Param('id') id: string, @Body() dto: SetBudgetStatusDto) {
    return this.service.setBudgetStatus(id, dto.status);
  }
  @Get('budgets/:id/variance') budgetVariance(@Param('id') id: string) {
    return this.service.budgetVariance(id);
  }

  @Post('costs') @RequirePermission('finance.manage') cost(
    @Body() dto: CreateCostSnapshotDto,
  ) {
    return this.service.createCostSnapshot(dto);
  }
  @Post('feedback')
  @RequireAnyPermission(
    'order.create',
    'meeting.book',
    'finance.manage',
    'company.manage',
  )
  createFeedback(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.service.createFeedback({
      ...dto,
      companyId:
        req.user.scope === 'CLIENT' ? req.user.companyId : dto.companyId,
      employeeId:
        req.user.scope === 'CLIENT' ? req.user.employeeId : dto.employeeId,
    });
  }
  @Patch('attendance/:bookingId')
  @RequireAnyPermission('branch.manage', 'company.manage')
  attendance(@Param('bookingId') id: string, @Body() dto: SetAttendanceDto) {
    return this.service.setAttendance(id, dto);
  }
  @Post('attendance/mark-no-shows')
  @RequireAnyPermission('branch.manage', 'company.manage')
  markNoShows(@Query('graceMinutes') grace?: string) {
    return this.service.markNoShows(grace ? Number(grace) : 30);
  }

  @Get('forecasts') forecasts(@Query('kind') kind?: ForecastKind) {
    return this.service.listForecasts(kind);
  }
  @Post('forecasts/generate')
  @RequireAnyPermission('finance.manage', 'company.manage')
  forecast(@Body() dto: GenerateForecastDto) {
    return this.service.generateForecast(dto);
  }
}
