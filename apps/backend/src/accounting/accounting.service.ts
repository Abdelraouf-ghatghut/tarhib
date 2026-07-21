import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccountType,
  ChartOfAccount,
} from './entities/chart-of-account.entity.js';
import {
  JournalEntry,
  JournalEntrySource,
  JournalEntryStatus,
} from './entities/journal-entry.entity.js';
import { JournalEntryLine } from './entities/journal-entry-line.entity.js';
import { FiscalYear, FiscalYearStatus } from './entities/fiscal-year.entity.js';
import { ExpenseCategory } from '../finance/entities/finance-expense.entity.js';
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

/** Compte débité pour chaque catégorie de dépense Finance — voir
 * FinanceService.createExpense/updateExpense/correctExpense. */
const EXPENSE_CATEGORY_DEBIT_ACCOUNT: Record<ExpenseCategory, string> = {
  [ExpenseCategory.RENT]: '606100',
  [ExpenseCategory.SALARIES]: '641000',
  [ExpenseCategory.UTILITIES]: '606200',
  [ExpenseCategory.MARKETING]: '623000',
  [ExpenseCategory.OTHER]: '628000',
};

function stripAccountType(
  row: TrialBalanceRowDto & { type: AccountType },
): TrialBalanceRowDto {
  return {
    accountId: row.accountId,
    code: row.code,
    label: row.label,
    totalDebit: row.totalDebit,
    totalCredit: row.totalCredit,
    balance: row.balance,
  };
}

interface PostEntryLine {
  accountId: string;
  debit?: number;
  credit?: number;
  label?: string | null;
  companyId?: string | null;
}

interface PostEntryParams {
  date: string;
  label: string;
  source: JournalEntrySource;
  sourceId?: string | null;
  status?: JournalEntryStatus;
  postedBy?: string | null;
  lines: PostEntryLine[];
}

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    @InjectRepository(ChartOfAccount)
    private readonly accountRepo: Repository<ChartOfAccount>,
    @InjectRepository(JournalEntry)
    private readonly entryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalEntryLine)
    private readonly lineRepo: Repository<JournalEntryLine>,
    @InjectRepository(FiscalYear)
    private readonly fiscalYearRepo: Repository<FiscalYear>,
  ) {}

  // ---- Chart of accounts ----

  async createAccount(
    dto: CreateChartOfAccountDto,
  ): Promise<ChartOfAccountDto> {
    const entity = this.accountRepo.create({
      code: dto.code,
      label: dto.label,
      type: dto.type,
      parentId: dto.parentId ?? null,
      active: dto.active ?? true,
    });
    return this.toAccountDto(await this.accountRepo.save(entity));
  }

  async findAllAccounts(): Promise<ChartOfAccountDto[]> {
    const entities = await this.accountRepo.find({ order: { code: 'ASC' } });
    return entities.map((e) => this.toAccountDto(e));
  }

  async updateAccount(
    id: string,
    dto: UpdateChartOfAccountDto,
  ): Promise<ChartOfAccountDto> {
    const entity = await this.accountRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Account ${id} not found`);
    Object.assign(entity, dto);
    return this.toAccountDto(await this.accountRepo.save(entity));
  }

  private async getAccountByCode(code: string): Promise<ChartOfAccount> {
    const account = await this.accountRepo.findOne({ where: { code } });
    if (!account) {
      throw new Error(`Chart of account ${code} not found — check seed`);
    }
    return account;
  }

  // ---- Fiscal years ----

  private async getOrCreateFiscalYearForDate(
    date: string,
  ): Promise<FiscalYear> {
    const year = Number(date.slice(0, 4));
    let fy = await this.fiscalYearRepo.findOne({ where: { year } });
    if (!fy) {
      fy = this.fiscalYearRepo.create({
        year,
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      });
      fy = await this.fiscalYearRepo.save(fy);
    }
    return fy;
  }

  private async isFiscalYearClosedForDate(date: string): Promise<boolean> {
    const year = Number(date.slice(0, 4));
    const fy = await this.fiscalYearRepo.findOne({ where: { year } });
    return fy?.status === FiscalYearStatus.CLOSED;
  }

  async getFiscalYear(year: number): Promise<FiscalYearDto> {
    const fy = await this.fiscalYearRepo.findOne({ where: { year } });
    if (!fy) throw new NotFoundException(`Fiscal year ${year} not found`);
    return this.toFiscalYearDto(fy);
  }

  /**
   * Clôture d'exercice : calcule le résultat net et, s'il est positif,
   * prépare une écriture d'impôt (24% : 20% bénéfices + 4% Jihad société) en
   * brouillon — jamais postée automatiquement. Tant que cette écriture reste
   * `DRAFT`, la clôture n'est PAS effective (le comptable doit d'abord la
   * relire/ajuster puis la valider via `validateDraftEntry`, puis rappeler
   * cette méthode pour clôturer réellement).
   */
  async closeFiscalYear(
    year: number,
    actorSub: string,
  ): Promise<CloseFiscalYearResultDto> {
    const fy = await this.fiscalYearRepo.findOne({ where: { year } });
    if (!fy) throw new NotFoundException(`Fiscal year ${year} not found`);
    if (fy.status === FiscalYearStatus.CLOSED) {
      throw new ConflictException('fiscalYearAlreadyClosed');
    }

    let taxEntry = await this.entryRepo.findOne({
      where: { fiscalYearId: fy.id, source: JournalEntrySource.TAX },
      relations: ['lines'],
    });

    if (!taxEntry) {
      const income = await this.getIncomeStatement(fy.startDate, fy.endDate);
      if (income.netProfit > 0) {
        const corporateTax = Math.round(income.netProfit * 0.2 * 100) / 100;
        const jihadTax = Math.round(income.netProfit * 0.04 * 100) / 100;
        const taxExpenseAccount = await this.getAccountByCode('695000');
        const corporateTaxPayable = await this.getAccountByCode('444000');
        const jihadPayable = await this.getAccountByCode('444100');
        taxEntry = await this.postEntry({
          date: fy.endDate,
          label: `Impôt sur les bénéfices ${fy.year} (brouillon à valider)`,
          source: JournalEntrySource.TAX,
          sourceId: fy.id,
          status: JournalEntryStatus.DRAFT,
          postedBy: actorSub,
          lines: [
            {
              accountId: taxExpenseAccount.id,
              debit: corporateTax + jihadTax,
            },
            { accountId: corporateTaxPayable.id, credit: corporateTax },
            { accountId: jihadPayable.id, credit: jihadTax },
          ],
        });
      }
    }

    if (taxEntry && taxEntry.status === JournalEntryStatus.DRAFT) {
      // Clôture bloquée tant que l'écriture d'impôt n'est pas validée.
      return {
        fiscalYear: this.toFiscalYearDto(fy),
        draftTaxEntry: this.toEntryDto(taxEntry),
      };
    }

    fy.status = FiscalYearStatus.CLOSED;
    fy.closedAt = new Date();
    fy.closedBy = actorSub;
    const saved = await this.fiscalYearRepo.save(fy);
    return { fiscalYear: this.toFiscalYearDto(saved), draftTaxEntry: null };
  }

  async reopenFiscalYear(year: number): Promise<FiscalYearDto> {
    const fy = await this.fiscalYearRepo.findOne({ where: { year } });
    if (!fy) throw new NotFoundException(`Fiscal year ${year} not found`);
    fy.status = FiscalYearStatus.OPEN;
    fy.closedAt = null;
    fy.closedBy = null;
    const saved = await this.fiscalYearRepo.save(fy);
    return this.toFiscalYearDto(saved);
  }

  // ---- Journal entries ----

  private async nextReference(fiscalYear: FiscalYear): Promise<string> {
    const count = await this.entryRepo.count({
      where: { fiscalYearId: fiscalYear.id },
    });
    return `JE-${fiscalYear.year}-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Poste une écriture — vérifie la partie double (somme débits = somme
   * crédits) et que l'exercice de la date n'est pas clôturé. Réutilisée par
   * la saisie manuelle et par tous les ponts automatiques (Finance,
   * Facturation, Paie).
   */
  async postEntry(params: PostEntryParams): Promise<JournalEntry> {
    const totalDebit = params.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredit = params.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    if (Math.round((totalDebit - totalCredit) * 100) !== 0) {
      throw new BadRequestException('journalEntryUnbalanced');
    }
    if (await this.isFiscalYearClosedForDate(params.date)) {
      throw new ConflictException('fiscalYearClosed');
    }

    const fiscalYear = await this.getOrCreateFiscalYearForDate(params.date);
    const reference = await this.nextReference(fiscalYear);

    const entry = this.entryRepo.create({
      date: params.date,
      reference,
      label: params.label,
      source: params.source,
      sourceId: params.sourceId ?? null,
      status: params.status ?? JournalEntryStatus.POSTED,
      postedBy: params.postedBy ?? null,
      fiscalYearId: fiscalYear.id,
      lines: params.lines.map((l) =>
        this.lineRepo.create({
          accountId: l.accountId,
          debit: l.debit ?? 0,
          credit: l.credit ?? 0,
          label: l.label ?? null,
          companyId: l.companyId ?? null,
        }),
      ),
    });
    return this.entryRepo.save(entry);
  }

  async createManualEntry(
    dto: CreateJournalEntryDto,
    actorSub: string,
  ): Promise<JournalEntryDto> {
    const entry = await this.postEntry({
      date: dto.date,
      label: dto.label,
      source: JournalEntrySource.MANUAL,
      postedBy: actorSub,
      lines: dto.lines,
    });
    return this.toEntryDto(entry);
  }

  async validateDraftEntry(
    id: string,
    actorSub: string,
  ): Promise<JournalEntryDto> {
    const entry = await this.entryRepo.findOne({
      where: { id },
      relations: ['lines'],
    });
    if (!entry) throw new NotFoundException(`Journal entry ${id} not found`);
    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new ConflictException('journalEntryNotDraft');
    }
    entry.status = JournalEntryStatus.POSTED;
    entry.postedBy = actorSub;
    const saved = await this.entryRepo.save(entry);
    return this.toEntryDto(saved);
  }

  // ---- Ponts automatiques (Finance) ----

  /**
   * Fire-and-forget, non-fatal — un problème de configuration comptable ne
   * doit jamais bloquer l'enregistrement d'une dépense côté Finance (même
   * gabarit que EmployeesService.syncCurrentMonthSalaryExpense).
   *
   * Une dépense a au plus UNE écriture associée (source=EXPENSE, sourceId=
   * l'id de la dépense) : un appel répété (update d'une dépense encore dans
   * une période ouverte) remplace l'écriture précédente plutôt que d'en
   * cumuler une nouvelle — sans risque vis-à-vis de la non-suppression
   * légale des écritures, puisque `FinanceService.updateExpense` interdit
   * déjà toute modification une fois la période clôturée (voir
   * period-lock.util.ts) : ce remplacement ne peut donc jamais toucher un
   * exercice déjà clos. Un montant négatif (ligne de contre-passation créée
   * par `correctExpense`) inverse simplement le sens débit/crédit.
   */
  async postExpenseEntry(expense: {
    id: string;
    category: ExpenseCategory;
    amount: number;
    expenseDate: string;
    paid: boolean;
  }): Promise<void> {
    try {
      await this.entryRepo.delete({
        source: JournalEntrySource.EXPENSE,
        sourceId: expense.id,
      });

      const debitAccount = await this.getAccountByCode(
        EXPENSE_CATEGORY_DEBIT_ACCOUNT[expense.category],
      );
      const creditCode = expense.paid
        ? '512000'
        : expense.category === ExpenseCategory.SALARIES
          ? '421000'
          : '401000';
      const creditAccount = await this.getAccountByCode(creditCode);

      const absAmount = Math.abs(expense.amount);
      if (absAmount === 0) return;
      const reversed = expense.amount < 0;

      await this.postEntry({
        date: expense.expenseDate,
        label: `Dépense ${expense.category}`,
        source: JournalEntrySource.EXPENSE,
        sourceId: expense.id,
        lines: [
          {
            accountId: debitAccount.id,
            debit: reversed ? 0 : absAmount,
            credit: reversed ? absAmount : 0,
          },
          {
            accountId: creditAccount.id,
            credit: reversed ? 0 : absAmount,
            debit: reversed ? absAmount : 0,
          },
        ],
      });
    } catch (err) {
      this.logger.error(
        `Failed to post accounting entry for expense ${expense.id}: ${String(err)}`,
      );
    }
  }

  /** Supprime l'écriture liée à une dépense supprimée — appelé uniquement
   * quand la dépense elle-même vient d'être supprimée avec succès (donc dans
   * une période encore ouverte, voir FinanceService.removeExpense). */
  async removeExpenseEntry(expenseId: string): Promise<void> {
    try {
      await this.entryRepo.delete({
        source: JournalEntrySource.EXPENSE,
        sourceId: expenseId,
      });
    } catch (err) {
      this.logger.error(
        `Failed to remove accounting entry for expense ${expenseId}: ${String(err)}`,
      );
    }
  }

  /** Droit de timbre 1% sur un contrat client actif — fire-and-forget. */
  async postContractStampDuty(contract: {
    id: string;
    amount: number;
    startDate: string;
  }): Promise<void> {
    try {
      const stampAmount = Math.round(contract.amount * 0.01 * 100) / 100;
      if (stampAmount <= 0) return;

      const debitAccount = await this.getAccountByCode('627000');
      const creditAccount = await this.getAccountByCode('447000');

      await this.postEntry({
        date: contract.startDate,
        label: `Droit de timbre 1% — contrat ${contract.id}`,
        source: JournalEntrySource.MANUAL,
        sourceId: contract.id,
        lines: [
          { accountId: debitAccount.id, debit: stampAmount },
          { accountId: creditAccount.id, credit: stampAmount },
        ],
      });
    } catch (err) {
      this.logger.error(
        `Failed to post stamp duty for contract ${contract.id}: ${String(err)}`,
      );
    }
  }

  /**
   * Paie mensuelle — débite le brut (641000) et la charge patronale CNSS
   * (645000), crédite le net à payer (421000) et chaque retenue à sa contre-
   * partie "à payer" (431000 CNSS combinée salarié+employeur, 444200/444300/
   * 444400 impôt/Jihad/solidarité, 447000 timbre) — voir PayslipService pour
   * le détail du calcul. Fire-and-forget, non-fatal (même gabarit que
   * postExpenseEntry) : un souci de configuration comptable ne doit jamais
   * bloquer la génération de la paie.
   */
  async postPayrollEntry(payslip: {
    id: string;
    date: string;
    grossSalary: number;
    cnssEmployeeContribution: number;
    cnssEmployerContribution: number;
    solidarityFundAmount: number;
    jihadTaxAmount: number;
    incomeTaxAmount: number;
    stampDutyAmount: number;
    netPay: number;
  }): Promise<void> {
    try {
      const grossAccount = await this.getAccountByCode('641000');
      const employerChargeAccount = await this.getAccountByCode('645000');
      const netPayableAccount = await this.getAccountByCode('421000');
      const cnssPayableAccount = await this.getAccountByCode('431000');
      const incomeTaxPayableAccount = await this.getAccountByCode('444200');
      const jihadPayableAccount = await this.getAccountByCode('444300');
      const solidarityPayableAccount = await this.getAccountByCode('444400');
      const stampDutyPayableAccount = await this.getAccountByCode('447000');

      const lines: PostEntryLine[] = [
        { accountId: grossAccount.id, debit: payslip.grossSalary },
        {
          accountId: employerChargeAccount.id,
          debit: payslip.cnssEmployerContribution,
        },
        { accountId: netPayableAccount.id, credit: payslip.netPay },
        {
          accountId: cnssPayableAccount.id,
          credit:
            payslip.cnssEmployeeContribution + payslip.cnssEmployerContribution,
        },
        {
          accountId: incomeTaxPayableAccount.id,
          credit: payslip.incomeTaxAmount,
        },
        { accountId: jihadPayableAccount.id, credit: payslip.jihadTaxAmount },
        {
          accountId: solidarityPayableAccount.id,
          credit: payslip.solidarityFundAmount,
        },
        {
          accountId: stampDutyPayableAccount.id,
          credit: payslip.stampDutyAmount,
        },
      ].filter((l) => (l.debit ?? l.credit ?? 0) > 0);

      await this.postEntry({
        date: payslip.date,
        label: `Paie ${payslip.date.slice(0, 7)}`,
        source: JournalEntrySource.PAYROLL,
        sourceId: payslip.id,
        lines,
      });
    } catch (err) {
      this.logger.error(
        `Failed to post payroll entry for payslip ${payslip.id}: ${String(err)}`,
      );
    }
  }

  // ---- Rapports ----

  private async getTrialBalanceWithType(
    from?: string,
    to?: string,
  ): Promise<Array<TrialBalanceRowDto & { type: AccountType }>> {
    const qb = this.lineRepo
      .createQueryBuilder('l')
      .innerJoin('l.journalEntry', 'e')
      .innerJoin('l.account', 'a')
      .select('a.id', 'accountId')
      .addSelect('a.code', 'code')
      .addSelect('a.label', 'label')
      .addSelect('a.type', 'type')
      .addSelect('COALESCE(SUM(l.debit), 0)', 'totalDebit')
      .addSelect('COALESCE(SUM(l.credit), 0)', 'totalCredit')
      .groupBy('a.id')
      .addGroupBy('a.code')
      .addGroupBy('a.label')
      .addGroupBy('a.type')
      .orderBy('a.code', 'ASC');
    if (from) qb.andWhere('e.date >= :from', { from });
    if (to) qb.andWhere('e.date <= :to', { to });

    const rows = await qb.getRawMany<{
      accountId: string;
      code: string;
      label: string;
      type: AccountType;
      totalDebit: string;
      totalCredit: string;
    }>();

    return rows.map((r) => ({
      accountId: r.accountId,
      code: r.code,
      label: r.label,
      type: r.type,
      totalDebit: Number(r.totalDebit),
      totalCredit: Number(r.totalCredit),
      balance: Number(r.totalDebit) - Number(r.totalCredit),
    }));
  }

  async getTrialBalance(
    from?: string,
    to?: string,
  ): Promise<TrialBalanceRowDto[]> {
    const rows = await this.getTrialBalanceWithType(from, to);
    return rows.map((r) => stripAccountType(r));
  }

  async getLedger(
    accountId: string,
    from?: string,
    to?: string,
  ): Promise<LedgerEntryDto[]> {
    const qb = this.lineRepo
      .createQueryBuilder('l')
      .innerJoin('l.journalEntry', 'e')
      .select('e.id', 'journalEntryId')
      .addSelect('e.reference', 'reference')
      .addSelect('e.date', 'date')
      .addSelect('e.label', 'label')
      .addSelect('l.debit', 'debit')
      .addSelect('l.credit', 'credit')
      .where('l.accountId = :accountId', { accountId })
      .orderBy('e.date', 'ASC');
    if (from) qb.andWhere('e.date >= :from', { from });
    if (to) qb.andWhere('e.date <= :to', { to });

    const rows = await qb.getRawMany<{
      journalEntryId: string;
      reference: string;
      date: string;
      label: string;
      debit: string;
      credit: string;
    }>();
    return rows.map((r) => ({
      journalEntryId: r.journalEntryId,
      reference: r.reference,
      date: r.date,
      label: r.label,
      debit: Number(r.debit),
      credit: Number(r.credit),
    }));
  }

  async getBalanceSheet(asOf?: string): Promise<BalanceSheetDto> {
    const rows = await this.getTrialBalanceWithType(undefined, asOf);
    const assets = rows.filter((r) => r.type === AccountType.ASSET);
    const liabilities = rows.filter((r) => r.type === AccountType.LIABILITY);
    const equity = rows.filter((r) => r.type === AccountType.EQUITY);

    return {
      totalAssets: assets.reduce((s, r) => s + r.balance, 0),
      totalLiabilities: liabilities.reduce((s, r) => s - r.balance, 0),
      totalEquity: equity.reduce((s, r) => s - r.balance, 0),
      assets: assets.map((r) => stripAccountType(r)),
      liabilities: liabilities.map((r) => stripAccountType(r)),
      equity: equity.map((r) => stripAccountType(r)),
    };
  }

  async getIncomeStatement(
    from?: string,
    to?: string,
  ): Promise<IncomeStatementDto> {
    const rows = await this.getTrialBalanceWithType(from, to);
    const revenue = rows.filter((r) => r.type === AccountType.REVENUE);
    const expense = rows.filter((r) => r.type === AccountType.EXPENSE);

    const totalRevenue = revenue.reduce((s, r) => s - r.balance, 0);
    const totalExpense = expense.reduce((s, r) => s + r.balance, 0);

    return {
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
      revenue: revenue.map((r) => stripAccountType(r)),
      expense: expense.map((r) => stripAccountType(r)),
    };
  }

  // ---- Mapping ----

  private toAccountDto(e: ChartOfAccount): ChartOfAccountDto {
    return {
      id: e.id,
      code: e.code,
      label: e.label,
      type: e.type,
      parentId: e.parentId,
      active: e.active,
    };
  }

  private toEntryDto(e: JournalEntry): JournalEntryDto {
    return {
      id: e.id,
      date: e.date,
      reference: e.reference,
      label: e.label,
      source: e.source,
      sourceId: e.sourceId,
      status: e.status,
      postedBy: e.postedBy,
      fiscalYearId: e.fiscalYearId,
      lines: (e.lines ?? []).map((l) => ({
        id: l.id,
        accountId: l.accountId,
        debit: Number(l.debit),
        credit: Number(l.credit),
        label: l.label,
        companyId: l.companyId,
      })),
    };
  }

  private toFiscalYearDto(e: FiscalYear): FiscalYearDto {
    return {
      id: e.id,
      year: e.year,
      startDate: e.startDate,
      endDate: e.endDate,
      status: e.status,
      closedAt: e.closedAt?.toISOString() ?? null,
    };
  }
}
