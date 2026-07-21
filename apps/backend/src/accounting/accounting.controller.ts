import {
  Body,
  Controller,
  Get,
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
import {
  RequireAnyPermission,
  RequirePermission,
} from '../auth/decorators/require-permission.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { AccountingService } from './accounting.service.js';
import {
  BalanceSheetDto,
  ChartOfAccountDto,
  CloseFiscalYearResultDto,
  CreateChartOfAccountDto,
  CreateJournalEntryDto,
  FiscalYearDto,
  IncomeStatementDto,
  JournalEntryDto,
  LedgerEntryDto,
  TrialBalanceRowDto,
  UpdateChartOfAccountDto,
} from './dto/accounting.dto.js';

// Comptabilité générale Tarhib (partie double, plan comptable, exercices) —
// fondation dont Facturation et Paie RH postent leurs écritures. Distincte
// du cycle commande/quota client (§3.1/§4 CLAUDE.md).
@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequireAnyPermission('accounting.view', 'accounting.manage')
@Controller('accounting')
export class AccountingController {
  constructor(private readonly service: AccountingService) {}

  // ---- Chart of accounts ----

  @Post('accounts')
  @RequirePermission('accounting.manage')
  @ApiOperation({ summary: 'Créer un compte du plan comptable' })
  @ApiResponse({ status: 201, type: ChartOfAccountDto })
  createAccount(
    @Body() dto: CreateChartOfAccountDto,
  ): Promise<ChartOfAccountDto> {
    return this.service.createAccount(dto);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Lister le plan comptable' })
  @ApiResponse({ status: 200, type: [ChartOfAccountDto] })
  findAllAccounts(): Promise<ChartOfAccountDto[]> {
    return this.service.findAllAccounts();
  }

  @Patch('accounts/:id')
  @RequirePermission('accounting.manage')
  @ApiResponse({ status: 200, type: ChartOfAccountDto })
  updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateChartOfAccountDto,
  ): Promise<ChartOfAccountDto> {
    return this.service.updateAccount(id, dto);
  }

  // ---- Journal entries ----

  @Post('journal-entries')
  @RequirePermission('accounting.manage')
  @ApiOperation({ summary: "Saisie manuelle d'une écriture comptable" })
  @ApiResponse({ status: 201, type: JournalEntryDto })
  createManualEntry(
    @Body() dto: CreateJournalEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<JournalEntryDto> {
    return this.service.createManualEntry(dto, user.sub);
  }

  @Patch('journal-entries/:id/validate')
  @RequirePermission('accounting.manage')
  @ApiOperation({
    summary:
      "Valide une écriture brouillon (ex. impôt sur les bénéfices à la clôture d'exercice) — la poste définitivement",
  })
  @ApiResponse({ status: 200, type: JournalEntryDto })
  validateDraftEntry(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<JournalEntryDto> {
    return this.service.validateDraftEntry(id, user.sub);
  }

  // ---- Rapports ----

  @Get('ledger')
  @ApiOperation({ summary: "Grand livre d'un compte" })
  @ApiQuery({ name: 'accountId', required: true })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200, type: [LedgerEntryDto] })
  getLedger(
    @Query('accountId') accountId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<LedgerEntryDto[]> {
    return this.service.getLedger(accountId, from, to);
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Balance générale' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200, type: [TrialBalanceRowDto] })
  getTrialBalance(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<TrialBalanceRowDto[]> {
    return this.service.getTrialBalance(from, to);
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Bilan (actif / passif / capitaux propres)' })
  @ApiQuery({ name: 'asOf', required: false })
  @ApiResponse({ status: 200, type: BalanceSheetDto })
  getBalanceSheet(@Query('asOf') asOf?: string): Promise<BalanceSheetDto> {
    return this.service.getBalanceSheet(asOf);
  }

  @Get('income-statement')
  @ApiOperation({ summary: 'Compte de résultat (produits / charges)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200, type: IncomeStatementDto })
  getIncomeStatement(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<IncomeStatementDto> {
    return this.service.getIncomeStatement(from, to);
  }

  // ---- Fiscal years ----

  @Get('fiscal-years/:year')
  @ApiOperation({ summary: "Statut d'un exercice comptable" })
  @ApiResponse({ status: 200, type: FiscalYearDto })
  getFiscalYear(@Param('year') year: string): Promise<FiscalYearDto> {
    return this.service.getFiscalYear(Number(year));
  }

  @Post('fiscal-years/:year/close')
  @RequirePermission('accounting.manage')
  @ApiOperation({
    summary:
      "Clôture un exercice — prépare l'écriture d'impôt en brouillon si l'exercice est bénéficiaire ; la clôture ne devient effective qu'après validation de cette écriture",
  })
  @ApiResponse({ status: 201, type: CloseFiscalYearResultDto })
  closeFiscalYear(
    @Param('year') year: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<CloseFiscalYearResultDto> {
    return this.service.closeFiscalYear(Number(year), user.sub);
  }

  @Post('fiscal-years/:year/reopen')
  @RequirePermission('company.manage')
  @ApiOperation({
    summary:
      'Rouvre un exercice déjà clôturé — réservé au Super Admin (annule la garantie de la clôture)',
  })
  @ApiResponse({ status: 201, type: FiscalYearDto })
  reopenFiscalYear(@Param('year') year: string): Promise<FiscalYearDto> {
    return this.service.reopenFiscalYear(Number(year));
  }
}
