import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  RequireAnyPermission,
  RequirePermission,
} from '../auth/decorators/require-permission.decorator.js';
import { FinanceService } from './finance.service.js';
import { FinancePayrollService } from './finance-payroll.service.js';
import {
  CorrectFinanceExpenseDto,
  CreateFinanceAccountDto,
  CreateFinanceContractDto,
  CreateFinanceDebtDto,
  CreateFinanceExpenseDto,
  FinanceAccountDto,
  FinanceContractDto,
  FinanceDebtDto,
  FinanceExpenseDto,
  FinanceOverviewDto,
  FinancePeriodDto,
  UpdateFinanceAccountDto,
  UpdateFinanceContractDto,
  UpdateFinanceDebtDto,
  UpdateFinanceExpenseDto,
} from './dto/finance.dto.js';

// Comptabilité interne Tarhib (contrats clients = revenu, frais, dettes,
// comptes) — distinct de la règle "pas de budget" du §3.1 CLAUDE.md, qui ne
// concerne que le cycle commande/quota employé. Jamais exposé à l'app
// employé ni gated par un rôle client (§4 CLAUDE.md).
@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequireAnyPermission('finance.view', 'finance.manage')
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly service: FinanceService,
    private readonly payrollService: FinancePayrollService,
  ) {}

  /** Salaire : donnée sensible, jamais exposée (même en liste ou agrégée)
   * sans ce droit dédié — §4 CLAUDE.md. */
  private canViewSalary(req: Request & { user: JwtPayload }): boolean {
    return (
      req.user?.permissions?.includes('employee.salary.manage') ||
      req.user?.permissions?.includes('company.manage') ||
      false
    );
  }

  // ---- Contracts ----

  @Post('contracts')
  @RequirePermission('finance.manage')
  @ApiOperation({ summary: 'Créer un contrat client (revenu Tarhib)' })
  @ApiResponse({ status: 201, type: FinanceContractDto })
  createContract(
    @Body() dto: CreateFinanceContractDto,
  ): Promise<FinanceContractDto> {
    return this.service.createContract(dto);
  }

  @Get('contracts')
  @ApiOperation({ summary: 'Lister les contrats clients' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiResponse({ status: 200, type: [FinanceContractDto] })
  findAllContracts(
    @Query('companyId') companyId?: string,
  ): Promise<FinanceContractDto[]> {
    return this.service.findAllContracts(companyId);
  }

  @Patch('contracts/:id')
  @RequirePermission('finance.manage')
  @ApiResponse({ status: 200, type: FinanceContractDto })
  updateContract(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceContractDto,
  ): Promise<FinanceContractDto> {
    return this.service.updateContract(id, dto);
  }

  @Delete('contracts/:id')
  @RequirePermission('finance.manage')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  removeContract(@Param('id') id: string): Promise<void> {
    return this.service.removeContract(id);
  }

  // ---- Expenses ----

  @Post('expenses')
  @RequirePermission('finance.manage')
  @ApiOperation({ summary: 'Enregistrer un frais divers' })
  @ApiResponse({ status: 201, type: FinanceExpenseDto })
  createExpense(
    @Body() dto: CreateFinanceExpenseDto,
  ): Promise<FinanceExpenseDto> {
    return this.service.createExpense(dto);
  }

  @Get('expenses')
  @ApiOperation({
    summary:
      'Lister les frais divers — les lignes de catégorie SALARIES sont omises sans employee.salary.manage/company.manage',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200, type: [FinanceExpenseDto] })
  findAllExpenses(
    @Req() req: Request & { user: JwtPayload },
    @Query('companyId') companyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<FinanceExpenseDto[]> {
    return this.service.findAllExpenses({
      companyId,
      from,
      to,
      canViewSalary: this.canViewSalary(req),
    });
  }

  @Patch('expenses/:id')
  @RequirePermission('finance.manage')
  @ApiResponse({ status: 200, type: FinanceExpenseDto })
  updateExpense(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceExpenseDto,
  ): Promise<FinanceExpenseDto> {
    return this.service.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  @RequirePermission('finance.manage')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  removeExpense(@Param('id') id: string): Promise<void> {
    return this.service.removeExpense(id);
  }

  @Post('expenses/:id/correct')
  @RequirePermission('finance.manage')
  @ApiOperation({
    summary:
      "Corrige une dépense dont la période est clôturée par contre-passation (ligne d'annulation + remplacement) — l'originale reste immuable",
  })
  @ApiResponse({ status: 201 })
  correctExpense(
    @Param('id') id: string,
    @Body() dto: CorrectFinanceExpenseDto,
  ): Promise<{
    original: FinanceExpenseDto;
    reversal: FinanceExpenseDto;
    replacement: FinanceExpenseDto | null;
  }> {
    return this.service.correctExpense(id, dto);
  }

  @Post('payroll/run')
  @RequirePermission('finance.manage')
  @ApiOperation({
    summary:
      'Rattrapage manuel de la paie mensuelle (السلاريس) — génère les lignes manquantes pour le mois demandé (par défaut le mois en cours), utile si le cron mensuel a été manqué',
  })
  @ApiResponse({ status: 201 })
  runPayroll(
    @Body() body: { period?: string },
  ): Promise<{ created: number; skipped: number }> {
    return this.payrollService.runPayroll(body?.period);
  }

  // ---- Periods ----
  //
  // Une période clôturée bloque toute création/modification/suppression de
  // dépense dessus (toutes catégories) — seule une contre-passation
  // (POST expenses/:id/correct) peut la corriger, datée dans la période
  // courante ouverte. Absence de ligne pour un mois = période ouverte.

  @Get('periods/:period')
  @ApiOperation({ summary: "Statut d'une période comptable ('YYYY-MM')" })
  @ApiResponse({ status: 200, type: FinancePeriodDto })
  getPeriodStatus(@Param('period') period: string): Promise<FinancePeriodDto> {
    return this.service.getPeriodStatus(period);
  }

  @Post('periods/:period/close')
  @RequirePermission('finance.manage')
  @ApiOperation({ summary: 'Clôture une période comptable' })
  @ApiResponse({ status: 201, type: FinancePeriodDto })
  closePeriod(
    @Param('period') period: string,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<FinancePeriodDto> {
    return this.service.closePeriod(period, req.user.sub);
  }

  @Post('periods/:period/reopen')
  @RequirePermission('company.manage')
  @ApiOperation({
    summary:
      'Rouvre une période déjà clôturée — réservé au Super Admin (annule la garantie de la clôture)',
  })
  @ApiResponse({ status: 201, type: FinancePeriodDto })
  reopenPeriod(@Param('period') period: string): Promise<FinancePeriodDto> {
    return this.service.reopenPeriod(period);
  }

  // ---- Debts ----

  @Post('debts')
  @RequirePermission('finance.manage')
  @ApiOperation({ summary: 'Enregistrer une dette envers un tiers' })
  @ApiResponse({ status: 201, type: FinanceDebtDto })
  createDebt(@Body() dto: CreateFinanceDebtDto): Promise<FinanceDebtDto> {
    return this.service.createDebt(dto);
  }

  @Get('debts')
  @ApiOperation({ summary: 'Lister les dettes' })
  @ApiResponse({ status: 200, type: [FinanceDebtDto] })
  findAllDebts(): Promise<FinanceDebtDto[]> {
    return this.service.findAllDebts();
  }

  @Patch('debts/:id')
  @RequirePermission('finance.manage')
  @ApiOperation({
    summary:
      'Mettre à jour une dette (ex. remainingAmount après un remboursement)',
  })
  @ApiResponse({ status: 200, type: FinanceDebtDto })
  updateDebt(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceDebtDto,
  ): Promise<FinanceDebtDto> {
    return this.service.updateDebt(id, dto);
  }

  @Delete('debts/:id')
  @RequirePermission('finance.manage')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  removeDebt(@Param('id') id: string): Promise<void> {
    return this.service.removeDebt(id);
  }

  // ---- Accounts ----

  @Post('accounts')
  @RequirePermission('finance.manage')
  @ApiOperation({ summary: 'Créer un compte bancaire/caisse Tarhib' })
  @ApiResponse({ status: 201, type: FinanceAccountDto })
  createAccount(
    @Body() dto: CreateFinanceAccountDto,
  ): Promise<FinanceAccountDto> {
    return this.service.createAccount(dto);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Lister les comptes' })
  @ApiResponse({ status: 200, type: [FinanceAccountDto] })
  findAllAccounts(): Promise<FinanceAccountDto[]> {
    return this.service.findAllAccounts();
  }

  @Patch('accounts/:id')
  @RequirePermission('finance.manage')
  @ApiOperation({ summary: 'Mettre à jour un compte (ex. solde constaté)' })
  @ApiResponse({ status: 200, type: FinanceAccountDto })
  updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceAccountDto,
  ): Promise<FinanceAccountDto> {
    return this.service.updateAccount(id, dto);
  }

  @Delete('accounts/:id')
  @RequirePermission('finance.manage')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  removeAccount(@Param('id') id: string): Promise<void> {
    return this.service.removeAccount(id);
  }

  // ---- Overview ----

  @Get('overview')
  @ApiOperation({
    summary:
      'Synthèse financière Tarhib : revenu (contrats actifs), dépenses, dettes restantes, solde des comptes',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200, type: FinanceOverviewDto })
  getOverview(
    @Req() req: Request & { user: JwtPayload },
    @Query('companyId') companyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<FinanceOverviewDto> {
    return this.service.getOverview({
      companyId,
      from,
      to,
      canViewSalary: this.canViewSalary(req),
    });
  }
}
