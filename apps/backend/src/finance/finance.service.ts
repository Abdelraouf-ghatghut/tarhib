import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import {
  ContractStatus,
  FinanceContract,
} from './entities/finance-contract.entity.js';
import {
  ExpenseCategory,
  FinanceExpense,
} from './entities/finance-expense.entity.js';
import { FinanceDebt } from './entities/finance-debt.entity.js';
import { FinanceAccount } from './entities/finance-account.entity.js';
import {
  FinancePeriod,
  FinancePeriodStatus,
} from './entities/finance-period.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { AccountingService } from '../accounting/accounting.service.js';
import { currentYearMonth } from './payroll-period.util.js';
import { expensePeriodOf, isPeriodClosed } from './period-lock.util.js';
import {
  CorrectFinanceExpenseDto,
  CreateFinanceAccountDto,
  CreateFinanceContractDto,
  CreateFinanceDebtDto,
  CreateFinanceExpenseDto,
  DerivedDebtStatus,
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

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(FinanceContract)
    private readonly contractRepo: Repository<FinanceContract>,
    @InjectRepository(FinanceExpense)
    private readonly expenseRepo: Repository<FinanceExpense>,
    @InjectRepository(FinanceDebt)
    private readonly debtRepo: Repository<FinanceDebt>,
    @InjectRepository(FinanceAccount)
    private readonly accountRepo: Repository<FinanceAccount>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(FinancePeriod)
    private readonly periodRepo: Repository<FinancePeriod>,
    private readonly accountingService: AccountingService,
  ) {}

  // ---- Contracts ----

  async createContract(
    dto: CreateFinanceContractDto,
  ): Promise<FinanceContractDto> {
    const entity = this.contractRepo.create({
      companyId: dto.companyId,
      label: dto.label,
      startDate: dto.startDate,
      endDate: dto.endDate,
      amount: dto.amount,
      billingFrequency: dto.billingFrequency,
      status: dto.status ?? ContractStatus.DRAFT,
      notes: dto.notes ?? null,
    });
    const saved = await this.contractRepo.save(entity);

    if (saved.status === ContractStatus.ACTIVE) {
      await this.accountingService.postContractStampDuty({
        id: saved.id,
        amount: Number(saved.amount),
        startDate: saved.startDate,
      });
    }

    return this.toContractDto(saved);
  }

  async findAllContracts(companyId?: string): Promise<FinanceContractDto[]> {
    const entities = await this.contractRepo.find({
      where: companyId ? { companyId } : {},
      order: { startDate: 'DESC' },
    });
    return entities.map((e) => this.toContractDto(e));
  }

  async updateContract(
    id: string,
    dto: UpdateFinanceContractDto,
  ): Promise<FinanceContractDto> {
    const entity = await this.contractRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Contract ${id} not found`);
    Object.assign(entity, dto);
    return this.toContractDto(await this.contractRepo.save(entity));
  }

  async removeContract(id: string): Promise<void> {
    const result = await this.contractRepo.delete(id);
    if (!result.affected)
      throw new NotFoundException(`Contract ${id} not found`);
  }

  // ---- Expenses ----
  //
  // Catégorie SALARIES : une ligne par (employeeId, payrollPeriod), générée
  // soit immédiatement pour le mois en cours par
  // EmployeesService.syncCurrentMonthSalaryExpense() lors d'une modification
  // de salaire, soit pour les mois suivants par FinancePayrollService (cron
  // mensuel + rattrapage manuel). Le sens dépense → employé (ici) passe par
  // un update TypeORM brut sur employeeRepo — jamais via EmployeesService,
  // pour ne pas redéclencher ce hook et créer une boucle — et ne s'applique
  // qu'à la ligne du mois EN COURS : corriger un mois passé est une
  // correction comptable historique qui ne doit pas changer le salaire actif
  // de l'employé.

  async createExpense(
    dto: CreateFinanceExpenseDto,
  ): Promise<FinanceExpenseDto> {
    const employeeId =
      dto.category === ExpenseCategory.SALARIES
        ? (dto.employeeId ?? null)
        : null;
    const payrollPeriod = employeeId
      ? (dto.payrollPeriod ?? currentYearMonth())
      : null;

    if (
      await isPeriodClosed(
        this.periodRepo,
        payrollPeriod ?? dto.expenseDate.slice(0, 7),
      )
    ) {
      throw new ConflictException('periodClosed');
    }

    if (employeeId) {
      const existing = await this.expenseRepo.findOne({
        where: {
          employeeId,
          category: ExpenseCategory.SALARIES,
          payrollPeriod: payrollPeriod as string,
        },
      });
      if (existing) {
        throw new ConflictException('employeeAlreadyHasSalaryExpense');
      }
    }

    const entity = this.expenseRepo.create({
      category: dto.category,
      label: dto.label,
      amount: dto.amount,
      expenseDate: dto.expenseDate,
      // Sans objet pour un salaire : l'employé travaille directement pour
      // Tarhib, aucune société cliente n'est liée à cette dépense.
      companyId:
        dto.category === ExpenseCategory.SALARIES
          ? null
          : (dto.companyId ?? null),
      employeeId,
      payrollPeriod,
      notes: dto.notes ?? null,
      paid: dto.paid ?? true,
    });
    const saved = await this.expenseRepo.save(entity);

    if (employeeId && payrollPeriod === currentYearMonth()) {
      await this.employeeRepo.update(employeeId, { salary: dto.amount });
    }

    await this.accountingService.postExpenseEntry({
      id: saved.id,
      category: saved.category,
      amount: Number(saved.amount),
      expenseDate: saved.expenseDate,
      paid: saved.paid,
    });

    return this.toExpenseDto(saved);
  }

  async findAllExpenses(
    opts: {
      companyId?: string;
      from?: string;
      to?: string;
      canViewSalary?: boolean;
    } = {},
  ): Promise<FinanceExpenseDto[]> {
    const qb = this.expenseRepo.createQueryBuilder('e');
    if (opts.companyId)
      qb.andWhere('e.company_id = :companyId', { companyId: opts.companyId });
    if (opts.from) qb.andWhere('e.expense_date >= :from', { from: opts.from });
    if (opts.to) qb.andWhere('e.expense_date <= :to', { to: opts.to });
    // Donnée sensible : jamais exposée, même en liste, sans ce droit — §4
    // CLAUDE.md, même règle que procurement.cost.view pour les achats.
    if (!opts.canViewSalary) {
      qb.andWhere('e.category != :salaries', {
        salaries: ExpenseCategory.SALARIES,
      });
    }
    qb.orderBy('e.expense_date', 'DESC');
    const entities = await qb.getMany();
    return entities.map((e) => this.toExpenseDto(e));
  }

  async updateExpense(
    id: string,
    dto: UpdateFinanceExpenseDto,
  ): Promise<FinanceExpenseDto> {
    const entity = await this.expenseRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Expense ${id} not found`);
    if (await isPeriodClosed(this.periodRepo, expensePeriodOf(entity))) {
      throw new ConflictException('periodClosedUseCorrection');
    }
    Object.assign(entity, dto);
    if (entity.category !== ExpenseCategory.SALARIES) {
      entity.employeeId = null;
    } else {
      // Sans objet pour un salaire — voir createExpense.
      entity.companyId = null;
    }
    const saved = await this.expenseRepo.save(entity);

    if (
      saved.category === ExpenseCategory.SALARIES &&
      saved.employeeId &&
      saved.payrollPeriod === currentYearMonth()
    ) {
      await this.employeeRepo.update(saved.employeeId, {
        salary: saved.amount,
      });
    }

    await this.accountingService.postExpenseEntry({
      id: saved.id,
      category: saved.category,
      amount: Number(saved.amount),
      expenseDate: saved.expenseDate,
      paid: saved.paid,
    });

    return this.toExpenseDto(saved);
  }

  async removeExpense(id: string): Promise<void> {
    const entity = await this.expenseRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Expense ${id} not found`);
    if (await isPeriodClosed(this.periodRepo, expensePeriodOf(entity))) {
      throw new ConflictException('periodClosedUseCorrection');
    }
    await this.expenseRepo.delete(id);
    await this.accountingService.removeExpenseEntry(id);

    if (
      entity.category === ExpenseCategory.SALARIES &&
      entity.employeeId &&
      entity.payrollPeriod === currentYearMonth()
    ) {
      await this.employeeRepo.update(entity.employeeId, { salary: null });
    }
  }

  /**
   * Correction d'une dépense dont la période est clôturée : la ligne
   * d'origine reste immuable (l'historique clôturé ne doit jamais changer) —
   * une contre-passation (montant négatif) l'annule, puis, sauf `cancel`, une
   * ligne de remplacement porte les nouvelles valeurs. Les deux nouvelles
   * lignes sont datées dans la période courante ouverte (jamais l'ancienne).
   */
  async correctExpense(
    id: string,
    dto: CorrectFinanceExpenseDto,
  ): Promise<{
    original: FinanceExpenseDto;
    reversal: FinanceExpenseDto;
    replacement: FinanceExpenseDto | null;
  }> {
    const original = await this.expenseRepo.findOne({ where: { id } });
    if (!original) throw new NotFoundException(`Expense ${id} not found`);

    const period = original.employeeId ? currentYearMonth() : null;
    const today = new Date().toISOString().slice(0, 10);

    const reversal = await this.expenseRepo.save(
      this.expenseRepo.create({
        category: original.category,
        label: `Contre-passation — ${original.label}`,
        amount: -Number(original.amount),
        expenseDate: today,
        companyId: original.companyId,
        employeeId: original.employeeId,
        payrollPeriod: period,
        reversalOfId: original.id,
        notes: dto.reason,
        paid: original.paid,
      }),
    );
    await this.accountingService.postExpenseEntry({
      id: reversal.id,
      category: reversal.category,
      amount: Number(reversal.amount),
      expenseDate: reversal.expenseDate,
      paid: reversal.paid,
    });

    let replacement: FinanceExpense | null = null;
    if (!dto.cancel) {
      replacement = await this.expenseRepo.save(
        this.expenseRepo.create({
          category: dto.category ?? original.category,
          label: dto.label ?? original.label,
          amount: dto.amount ?? Number(original.amount),
          expenseDate: dto.expenseDate ?? today,
          companyId: dto.companyId ?? original.companyId,
          employeeId: original.employeeId,
          payrollPeriod: period,
          reversalOfId: original.id,
          notes: dto.notes ?? dto.reason,
          paid: original.paid,
        }),
      );

      if (
        replacement.category === ExpenseCategory.SALARIES &&
        replacement.employeeId &&
        replacement.payrollPeriod === currentYearMonth()
      ) {
        await this.employeeRepo.update(replacement.employeeId, {
          salary: replacement.amount,
        });
      }

      await this.accountingService.postExpenseEntry({
        id: replacement.id,
        category: replacement.category,
        amount: Number(replacement.amount),
        expenseDate: replacement.expenseDate,
        paid: replacement.paid,
      });
    }

    return {
      original: this.toExpenseDto(original),
      reversal: this.toExpenseDto(reversal),
      replacement: replacement ? this.toExpenseDto(replacement) : null,
    };
  }

  // ---- Periods ----

  async getPeriodStatus(period: string): Promise<FinancePeriodDto> {
    const row = await this.periodRepo.findOne({ where: { period } });
    return {
      period,
      status: row?.status ?? FinancePeriodStatus.OPEN,
      closedAt: row?.closedAt?.toISOString() ?? null,
    };
  }

  async closePeriod(
    period: string,
    actorSub: string,
  ): Promise<FinancePeriodDto> {
    let row = await this.periodRepo.findOne({ where: { period } });
    if (!row) row = this.periodRepo.create({ period });
    row.status = FinancePeriodStatus.CLOSED;
    row.closedAt = new Date();
    row.closedBy = actorSub;
    const saved = await this.periodRepo.save(row);
    return {
      period: saved.period,
      status: saved.status,
      closedAt: saved.closedAt?.toISOString() ?? null,
    };
  }

  async reopenPeriod(period: string): Promise<FinancePeriodDto> {
    let row = await this.periodRepo.findOne({ where: { period } });
    if (!row) row = this.periodRepo.create({ period });
    row.status = FinancePeriodStatus.OPEN;
    row.closedAt = null;
    row.closedBy = null;
    const saved = await this.periodRepo.save(row);
    return {
      period: saved.period,
      status: saved.status,
      closedAt: null,
    };
  }

  // ---- Debts ----

  async createDebt(dto: CreateFinanceDebtDto): Promise<FinanceDebtDto> {
    const entity = this.debtRepo.create({
      creditorName: dto.creditorName,
      totalAmount: dto.totalAmount,
      remainingAmount: dto.remainingAmount ?? dto.totalAmount,
      dueDate: dto.dueDate ?? null,
      notes: dto.notes ?? null,
    });
    return this.toDebtDto(await this.debtRepo.save(entity));
  }

  async findAllDebts(): Promise<FinanceDebtDto[]> {
    const entities = await this.debtRepo.find({
      order: { dueDate: 'ASC' },
    });
    return entities.map((e) => this.toDebtDto(e));
  }

  async updateDebt(
    id: string,
    dto: UpdateFinanceDebtDto,
  ): Promise<FinanceDebtDto> {
    const entity = await this.debtRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Debt ${id} not found`);
    Object.assign(entity, dto);
    return this.toDebtDto(await this.debtRepo.save(entity));
  }

  async removeDebt(id: string): Promise<void> {
    const result = await this.debtRepo.delete(id);
    if (!result.affected) throw new NotFoundException(`Debt ${id} not found`);
  }

  // ---- Accounts ----

  async createAccount(
    dto: CreateFinanceAccountDto,
  ): Promise<FinanceAccountDto> {
    const entity = this.accountRepo.create({
      name: dto.name,
      type: dto.type,
      balance: dto.balance ?? 0,
      notes: dto.notes ?? null,
    });
    return this.toAccountDto(await this.accountRepo.save(entity));
  }

  async findAllAccounts(): Promise<FinanceAccountDto[]> {
    const entities = await this.accountRepo.find({ order: { name: 'ASC' } });
    return entities.map((e) => this.toAccountDto(e));
  }

  async updateAccount(
    id: string,
    dto: UpdateFinanceAccountDto,
  ): Promise<FinanceAccountDto> {
    const entity = await this.accountRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Account ${id} not found`);
    Object.assign(entity, dto);
    return this.toAccountDto(await this.accountRepo.save(entity));
  }

  async removeAccount(id: string): Promise<void> {
    const result = await this.accountRepo.delete(id);
    if (!result.affected)
      throw new NotFoundException(`Account ${id} not found`);
  }

  // ---- Overview ----

  /**
   * Vue de synthèse Tarhib : revenu (contrats actifs), dépenses (période),
   * dettes restantes, solde des comptes. companyId filtre contrats/dépenses
   * uniquement — dettes et comptes sont toujours globaux à Tarhib.
   *
   * Les salaires (catégorie SALARIES, synchronisés avec employees.salary —
   * voir EmployeesService.syncSalaryExpense) sont des dépenses comme les
   * autres et donc déjà comptés dans totalExpenses. `payrollMass` n'est
   * qu'un sous-total informatif de ce qui est déjà inclus, jamais une
   * addition séparée — et, comme `findAllExpenses`, entièrement absent (0)
   * si l'appelant n'a pas `employee.salary.manage`/`company.manage` (donnée
   * sensible, §4 CLAUDE.md — filtrage backend, pas seulement côté UI).
   */
  async getOverview(
    opts: {
      companyId?: string;
      from?: string;
      to?: string;
      canViewSalary?: boolean;
    } = {},
  ): Promise<FinanceOverviewDto> {
    const today = new Date().toISOString().slice(0, 10);

    const activeContracts = await this.contractRepo.find({
      where: {
        ...(opts.companyId ? { companyId: opts.companyId } : {}),
        status: ContractStatus.ACTIVE,
        endDate: MoreThanOrEqual(today),
      },
    });
    const activeContractsRevenue = activeContracts.reduce(
      (sum, c) => sum + Number(c.amount),
      0,
    );

    const expenses = await this.findAllExpenses({
      companyId: opts.companyId,
      from: opts.from,
      to: opts.to,
      canViewSalary: opts.canViewSalary,
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const payrollMass = opts.canViewSalary
      ? expenses
          .filter((e) => e.category === ExpenseCategory.SALARIES)
          .reduce((sum, e) => sum + e.amount, 0)
      : 0;

    const debts = await this.debtRepo.find();
    const totalDebtRemaining = debts.reduce(
      (sum, d) => sum + Number(d.remainingAmount),
      0,
    );

    const accounts = await this.accountRepo.find();
    const totalAccountsBalance = accounts.reduce(
      (sum, a) => sum + Number(a.balance),
      0,
    );

    return {
      activeContractsRevenue,
      totalExpenses,
      totalDebtRemaining,
      totalAccountsBalance,
      payrollMass,
    };
  }

  // ---- Mapping / statuts dérivés ----

  private toContractDto(e: FinanceContract): FinanceContractDto {
    return {
      id: e.id,
      companyId: e.companyId,
      label: e.label,
      startDate: e.startDate,
      endDate: e.endDate,
      amount: Number(e.amount),
      billingFrequency: e.billingFrequency,
      status: e.status,
      isExpired: e.endDate < new Date().toISOString().slice(0, 10),
      notes: e.notes,
    };
  }

  private toExpenseDto(e: FinanceExpense): FinanceExpenseDto {
    return {
      id: e.id,
      category: e.category,
      label: e.label,
      amount: Number(e.amount),
      expenseDate: e.expenseDate,
      companyId: e.companyId,
      employeeId: e.employeeId,
      payrollPeriod: e.payrollPeriod,
      notes: e.notes,
      reversalOfId: e.reversalOfId,
      paid: e.paid,
    };
  }

  private toDebtDto(e: FinanceDebt): FinanceDebtDto {
    const total = Number(e.totalAmount);
    const remaining = Number(e.remainingAmount);
    return {
      id: e.id,
      creditorName: e.creditorName,
      totalAmount: total,
      remainingAmount: remaining,
      dueDate: e.dueDate,
      status: this.debtStatus(remaining, total, e.dueDate),
      notes: e.notes,
    };
  }

  private debtStatus(
    remaining: number,
    total: number,
    dueDate: string | null,
  ): DerivedDebtStatus {
    if (remaining <= 0) return DerivedDebtStatus.PAID;
    const today = new Date().toISOString().slice(0, 10);
    if (dueDate && dueDate < today) return DerivedDebtStatus.OVERDUE;
    return remaining < total
      ? DerivedDebtStatus.PARTIALLY_PAID
      : DerivedDebtStatus.PENDING;
  }

  private toAccountDto(e: FinanceAccount): FinanceAccountDto {
    return {
      id: e.id,
      name: e.name,
      type: e.type,
      balance: Number(e.balance),
      notes: e.notes,
    };
  }
}
