import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  RequireAnyPermission,
  RequirePermission,
} from '../auth/decorators/require-permission.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { HrService } from './hr.service.js';
import { PayslipService } from './payslip.service.js';
import { LeaveRequestStatus } from './entities/leave-request.entity.js';
import {
  ContractDocumentService,
  type ContractUpload,
} from './contract-document.service.js';
import {
  CreateEmploymentContractDto,
  CreateLeaveRequestDto,
  CreateLeaveTypeDto,
  CreatePerformanceReviewDto,
  EmploymentContractDto,
  LeaveBalanceDto,
  LeaveRequestDto,
  LeaveTypeDto,
  PayrollTaxConfigDto,
  PayslipDto,
  PerformanceReviewDto,
  UpdateEmploymentContractDto,
  UpdateLeaveTypeDto,
  UpdatePayrollTaxConfigDto,
  UpdatePerformanceReviewDto,
} from './dto/hr.dto.js';

// RH complète — congés, bulletins de paie (barème fiscal libyen, voir
// PayslipService), contrats de travail, évaluations. Outil interne, jamais
// exposé à l'app employé (§4 CLAUDE.md) : la saisie de congé est faite par un
// gestionnaire RH pour le compte de l'employé, pas en libre-service.
@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr')
export class HrController {
  constructor(
    private readonly service: HrService,
    private readonly payslipService: PayslipService,
    private readonly contractDocuments: ContractDocumentService,
  ) {}

  // ---- Leave types ----

  @Post('leave-types')
  @RequirePermission('hr.leave.manage')
  @ApiResponse({ status: 201, type: LeaveTypeDto })
  createLeaveType(@Body() dto: CreateLeaveTypeDto): Promise<LeaveTypeDto> {
    return this.service.createLeaveType(dto);
  }

  @Get('leave-types')
  @RequireAnyPermission('hr.leave.manage', 'hr.leave.approve')
  @ApiResponse({ status: 200, type: [LeaveTypeDto] })
  findAllLeaveTypes(): Promise<LeaveTypeDto[]> {
    return this.service.findAllLeaveTypes();
  }

  @Patch('leave-types/:id')
  @RequirePermission('hr.leave.manage')
  @ApiResponse({ status: 200, type: LeaveTypeDto })
  updateLeaveType(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveTypeDto,
  ): Promise<LeaveTypeDto> {
    return this.service.updateLeaveType(id, dto);
  }

  // ---- Leave requests ----

  @Post('leave-requests')
  @RequirePermission('hr.leave.manage')
  @ApiResponse({ status: 201, type: LeaveRequestDto })
  createLeaveRequest(
    @Body() dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequestDto> {
    return this.service.createLeaveRequest(dto);
  }

  @Get('leave-requests')
  @RequireAnyPermission('hr.leave.manage', 'hr.leave.approve')
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: LeaveRequestStatus })
  @ApiResponse({ status: 200, type: [LeaveRequestDto] })
  findAllLeaveRequests(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: LeaveRequestStatus,
  ): Promise<LeaveRequestDto[]> {
    return this.service.findAllLeaveRequests({ employeeId, status });
  }

  @Patch('leave-requests/:id/approve')
  @RequirePermission('hr.leave.approve')
  @ApiResponse({ status: 200, type: LeaveRequestDto })
  approveLeaveRequest(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<LeaveRequestDto> {
    return this.service.approveLeaveRequest(id, user.sub);
  }

  @Patch('leave-requests/:id/reject')
  @RequirePermission('hr.leave.approve')
  @ApiResponse({ status: 200, type: LeaveRequestDto })
  rejectLeaveRequest(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<LeaveRequestDto> {
    return this.service.rejectLeaveRequest(id, user.sub);
  }

  // ---- Leave balances ----

  @Get('leave-balances')
  @RequireAnyPermission('hr.leave.manage', 'hr.leave.approve')
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiResponse({ status: 200, type: [LeaveBalanceDto] })
  findLeaveBalances(
    @Query('employeeId') employeeId?: string,
    @Query('year') year?: string,
  ): Promise<LeaveBalanceDto[]> {
    return this.service.findLeaveBalances({
      employeeId,
      year: year ? Number(year) : undefined,
    });
  }

  // ---- Employment contracts ----

  @Post('contracts')
  @RequirePermission('hr.contract.manage')
  @ApiResponse({ status: 201, type: EmploymentContractDto })
  createContract(
    @Body() dto: CreateEmploymentContractDto,
  ): Promise<EmploymentContractDto> {
    return this.service.createContract(dto);
  }

  @Get('contracts')
  @RequirePermission('hr.contract.manage')
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiResponse({ status: 200, type: [EmploymentContractDto] })
  findAllContracts(
    @Query('employeeId') employeeId?: string,
  ): Promise<EmploymentContractDto[]> {
    return this.service.findAllContracts(employeeId);
  }

  @Patch('contracts/:id')
  @RequirePermission('hr.contract.manage')
  @ApiResponse({ status: 200, type: EmploymentContractDto })
  updateContract(
    @Param('id') id: string,
    @Body() dto: UpdateEmploymentContractDto,
  ): Promise<EmploymentContractDto> {
    return this.service.updateContract(id, dto);
  }

  @Post('contracts/:id/document')
  @RequirePermission('hr.contract.manage')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: 15 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async uploadContractDocument(
    @Param('id') id: string,
    @UploadedFile() file: ContractUpload,
  ): Promise<EmploymentContractDto> {
    const contract = await this.service.findContractEntity(id);
    const previousReference = contract.documentUrl;
    const newReference = await this.contractDocuments.store(id, file);
    try {
      const updated = await this.service.setContractDocument(id, newReference);
      await this.contractDocuments.remove(previousReference);
      return updated;
    } catch (err) {
      await this.contractDocuments.remove(newReference);
      throw err;
    }
  }

  @Get('contracts/:id/document')
  @RequirePermission('hr.contract.manage')
  async downloadContractDocument(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const contract = await this.service.findContractEntity(id);
    if (!contract.documentUrl) {
      throw new NotFoundException('contractDocumentNotFound');
    }
    const document = await this.contractDocuments.read(contract.documentUrl);
    response.set({
      'Content-Type': document.contentType,
      'Content-Disposition': `inline; filename="contract-${id}.${document.extension}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(document.buffer);
  }

  @Delete('contracts/:id/document')
  @RequirePermission('hr.contract.manage')
  async deleteContractDocument(
    @Param('id') id: string,
  ): Promise<EmploymentContractDto> {
    const contract = await this.service.findContractEntity(id);
    const reference = contract.documentUrl;
    const updated = await this.service.setContractDocument(id, null);
    await this.contractDocuments.remove(reference);
    return updated;
  }

  // ---- Performance reviews ----

  @Post('performance-reviews')
  @RequirePermission('hr.review.manage')
  @ApiResponse({ status: 201, type: PerformanceReviewDto })
  createReview(
    @Body() dto: CreatePerformanceReviewDto,
  ): Promise<PerformanceReviewDto> {
    return this.service.createReview(dto);
  }

  @Get('performance-reviews')
  @RequirePermission('hr.review.manage')
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiResponse({ status: 200, type: [PerformanceReviewDto] })
  findAllReviews(
    @Query('employeeId') employeeId?: string,
  ): Promise<PerformanceReviewDto[]> {
    return this.service.findAllReviews(employeeId);
  }

  @Patch('performance-reviews/:id')
  @RequirePermission('hr.review.manage')
  @ApiResponse({ status: 200, type: PerformanceReviewDto })
  updateReview(
    @Param('id') id: string,
    @Body() dto: UpdatePerformanceReviewDto,
  ): Promise<PerformanceReviewDto> {
    return this.service.updateReview(id, dto);
  }

  // ---- Payroll tax config ----
  //
  // Donnée sensible pilotant le calcul des bulletins de paie — même
  // permission que le salaire individuel (employee.salary.manage).

  @Get('payroll-tax-config')
  @RequirePermission('employee.salary.manage')
  @ApiOperation({
    summary: 'Barème fiscal appliqué au calcul des bulletins de paie',
  })
  @ApiResponse({ status: 200, type: PayrollTaxConfigDto })
  getPayrollTaxConfig(): Promise<PayrollTaxConfigDto> {
    return this.payslipService.getConfigDto();
  }

  @Patch('payroll-tax-config')
  @RequirePermission('employee.salary.manage')
  @ApiResponse({ status: 200, type: PayrollTaxConfigDto })
  updatePayrollTaxConfig(
    @Body() dto: UpdatePayrollTaxConfigDto,
  ): Promise<PayrollTaxConfigDto> {
    return this.payslipService.updateConfig(dto);
  }

  // ---- Payslips ----

  @Get('payslips')
  @RequirePermission('employee.salary.manage')
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'period', required: false })
  @ApiResponse({ status: 200, type: [PayslipDto] })
  findAllPayslips(
    @Query('employeeId') employeeId?: string,
    @Query('period') period?: string,
  ): Promise<PayslipDto[]> {
    return this.payslipService.findAllPayslips({ employeeId, period });
  }

  @Get('payslips/:id')
  @RequirePermission('employee.salary.manage')
  @ApiResponse({ status: 200, type: PayslipDto })
  findOnePayslip(@Param('id') id: string): Promise<PayslipDto> {
    return this.payslipService.findOnePayslip(id);
  }
}
