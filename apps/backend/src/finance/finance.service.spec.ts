import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FinanceService } from './finance.service.js';
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
import { DerivedDebtStatus } from './dto/finance.dto.js';
import { currentYearMonth } from './payroll-period.util.js';

const mockAccountingService = () => ({
  postExpenseEntry: jest.fn().mockResolvedValue(undefined),
  removeExpenseEntry: jest.fn().mockResolvedValue(undefined),
  postContractStampDuty: jest.fn().mockResolvedValue(undefined),
});

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => v),
  delete: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makeQb = (rows: Record<string, unknown>[]) => ({
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(rows),
});

describe('FinanceService', () => {
  let service: FinanceService;
  let contractRepo: ReturnType<typeof mockRepo>;
  let expenseRepo: ReturnType<typeof mockRepo>;
  let debtRepo: ReturnType<typeof mockRepo>;
  let accountRepo: ReturnType<typeof mockRepo>;
  let employeeRepo: ReturnType<typeof mockRepo>;
  let periodRepo: ReturnType<typeof mockRepo>;
  let accountingService: ReturnType<typeof mockAccountingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: getRepositoryToken(FinanceContract), useFactory: mockRepo },
        { provide: getRepositoryToken(FinanceExpense), useFactory: mockRepo },
        { provide: getRepositoryToken(FinanceDebt), useFactory: mockRepo },
        { provide: getRepositoryToken(FinanceAccount), useFactory: mockRepo },
        { provide: getRepositoryToken(Employee), useFactory: mockRepo },
        { provide: getRepositoryToken(FinancePeriod), useFactory: mockRepo },
        { provide: AccountingService, useFactory: mockAccountingService },
      ],
    }).compile();

    service = module.get(FinanceService);
    contractRepo = module.get(getRepositoryToken(FinanceContract));
    expenseRepo = module.get(getRepositoryToken(FinanceExpense));
    debtRepo = module.get(getRepositoryToken(FinanceDebt));
    accountRepo = module.get(getRepositoryToken(FinanceAccount));
    employeeRepo = module.get(getRepositoryToken(Employee));
    periodRepo = module.get(getRepositoryToken(FinancePeriod));
    periodRepo.findOne.mockResolvedValue(null); // toute période ouverte par défaut
    accountingService = module.get(AccountingService);
  });

  describe('getOverview', () => {
    it('sums active non-expired contracts, expenses, debt remainders and account balances', async () => {
      contractRepo.find.mockResolvedValue([
        { amount: '1000.00' },
        { amount: '500.50' },
      ]);
      expenseRepo.createQueryBuilder.mockReturnValue(
        makeQb([{ id: 'e1', amount: '200.00', expenseDate: '2026-07-01' }]),
      );
      debtRepo.find.mockResolvedValue([
        { remainingAmount: '300.00' },
        { remainingAmount: '0.00' },
      ]);
      accountRepo.find.mockResolvedValue([
        { balance: '4000.00' },
        { balance: '-150.25' },
      ]);

      const overview = await service.getOverview();

      expect(overview).toEqual({
        activeContractsRevenue: 1500.5,
        totalExpenses: 200,
        totalDebtRemaining: 300,
        totalAccountsBalance: 3849.75,
        payrollMass: 0,
      });
    });

    it('returns zero revenue when there are no active contracts', async () => {
      contractRepo.find.mockResolvedValue([]);
      expenseRepo.createQueryBuilder.mockReturnValue(makeQb([]));
      debtRepo.find.mockResolvedValue([]);
      accountRepo.find.mockResolvedValue([]);

      const overview = await service.getOverview();

      expect(overview).toEqual({
        activeContractsRevenue: 0,
        totalExpenses: 0,
        totalDebtRemaining: 0,
        totalAccountsBalance: 0,
        payrollMass: 0,
      });
    });

    it('never includes payroll mass and excludes SALARIES rows when the caller lacks employee.salary.manage/company.manage', async () => {
      contractRepo.find.mockResolvedValue([]);
      const qb = makeQb([
        { id: 'e1', amount: '200.00', expenseDate: '2026-07-01' },
      ]);
      expenseRepo.createQueryBuilder.mockReturnValue(qb);
      debtRepo.find.mockResolvedValue([]);
      accountRepo.find.mockResolvedValue([]);

      const overview = await service.getOverview({ canViewSalary: false });

      expect(overview.payrollMass).toBe(0);
      expect(overview.totalExpenses).toBe(200);
      expect(qb.andWhere).toHaveBeenCalledWith('e.category != :salaries', {
        salaries: ExpenseCategory.SALARIES,
      });
    });

    it('folds SALARIES expense rows into totalExpenses and payrollMass for an authorized caller', async () => {
      contractRepo.find.mockResolvedValue([]);
      expenseRepo.createQueryBuilder.mockReturnValue(
        makeQb([
          {
            id: 'e1',
            category: ExpenseCategory.SALARIES,
            amount: '5000.00',
            expenseDate: '2026-07-01',
            employeeId: 'emp-1',
          },
          {
            id: 'e2',
            category: ExpenseCategory.OTHER,
            amount: '200.00',
            expenseDate: '2026-07-01',
          },
        ]),
      );
      debtRepo.find.mockResolvedValue([]);
      accountRepo.find.mockResolvedValue([]);

      const overview = await service.getOverview({
        canViewSalary: true,
        from: '2026-07-01',
        to: '2026-07-31',
      });

      expect(overview.payrollMass).toBe(5000);
      expect(overview.totalExpenses).toBe(5200);
    });
  });

  describe('createExpense — salary sync (employee → expense vice versa)', () => {
    it('updates the linked employee salary when creating a SALARIES expense', async () => {
      expenseRepo.findOne.mockResolvedValue(null);

      await service.createExpense({
        category: ExpenseCategory.SALARIES,
        label: 'Salaire Jean',
        amount: 6000,
        expenseDate: '2026-07-01',
        employeeId: 'emp-1',
      });

      expect(employeeRepo.update).toHaveBeenCalledWith('emp-1', {
        salary: 6000,
      });
      expect(accountingService.postExpenseEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ExpenseCategory.SALARIES,
          amount: 6000,
        }),
      );
    });

    it('rejects a second SALARIES expense for an employee who already has one', async () => {
      expenseRepo.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createExpense({
          category: ExpenseCategory.SALARIES,
          label: 'Salaire Jean (bis)',
          amount: 6000,
          expenseDate: '2026-07-01',
          employeeId: 'emp-1',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(employeeRepo.update).not.toHaveBeenCalled();
    });

    it('ignores employeeId for non-SALARIES categories', async () => {
      await service.createExpense({
        category: ExpenseCategory.OTHER,
        label: 'Fournitures',
        amount: 100,
        expenseDate: '2026-07-01',
        employeeId: 'emp-1',
      });

      expect(employeeRepo.update).not.toHaveBeenCalled();
    });

    it('forces companyId to null for a SALARIES expense even if provided', async () => {
      expenseRepo.findOne.mockResolvedValue(null);

      const result = await service.createExpense({
        category: ExpenseCategory.SALARIES,
        label: 'Salaire Jean',
        amount: 6000,
        expenseDate: '2026-07-01',
        employeeId: 'emp-1',
        companyId: 'co-1',
      });

      expect(result.companyId).toBeNull();
      expect(expenseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: null }),
      );
    });

    it('allows a second SALARIES expense for the same employee on a different payroll period', async () => {
      expenseRepo.findOne.mockResolvedValue(null); // aucune ligne pour CE mois précis

      await expect(
        service.createExpense({
          category: ExpenseCategory.SALARIES,
          label: 'Salaire Jean — juin',
          amount: 5000,
          expenseDate: '2026-06-01',
          employeeId: 'emp-1',
          payrollPeriod: '2026-06',
        }),
      ).resolves.toBeDefined();
      const calls = expenseRepo.findOne.mock.calls as unknown as Array<
        [{ where: { payrollPeriod: string } }]
      >;
      expect(calls[0][0].where.payrollPeriod).toBe('2026-06');
    });

    it('does not resync employees.salary when creating a SALARIES row for a past payroll period', async () => {
      expenseRepo.findOne.mockResolvedValue(null);

      await service.createExpense({
        category: ExpenseCategory.SALARIES,
        label: 'Salaire Jean — juin',
        amount: 5000,
        expenseDate: '2026-06-01',
        employeeId: 'emp-1',
        payrollPeriod: '2020-01',
      });

      expect(employeeRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('updateExpense — salary sync', () => {
    it('updates the employee salary when the amount of the CURRENT month SALARIES expense changes', async () => {
      expenseRepo.findOne.mockResolvedValue({
        id: 'e1',
        category: ExpenseCategory.SALARIES,
        amount: 5000,
        employeeId: 'emp-1',
        payrollPeriod: currentYearMonth(),
      });

      await service.updateExpense('e1', { amount: 7000 });

      expect(employeeRepo.update).toHaveBeenCalledWith('emp-1', {
        salary: 7000,
      });
    });

    it('does NOT resync employees.salary when correcting a PAST month SALARIES expense', async () => {
      expenseRepo.findOne.mockResolvedValue({
        id: 'e1',
        category: ExpenseCategory.SALARIES,
        amount: 5000,
        employeeId: 'emp-1',
        payrollPeriod: '2020-01',
      });

      await service.updateExpense('e1', { amount: 7000 });

      expect(employeeRepo.update).not.toHaveBeenCalled();
    });

    it('forces companyId to null when the category is (or stays) SALARIES, even if provided', async () => {
      expenseRepo.findOne.mockResolvedValue({
        id: 'e1',
        category: ExpenseCategory.SALARIES,
        amount: 5000,
        employeeId: 'emp-1',
        payrollPeriod: currentYearMonth(),
      });

      const result = await service.updateExpense('e1', { companyId: 'co-1' });

      expect(result.companyId).toBeNull();
    });

    it('clears employeeId when the category is changed away from SALARIES', async () => {
      expenseRepo.findOne.mockResolvedValue({
        id: 'e1',
        category: ExpenseCategory.SALARIES,
        amount: 5000,
        employeeId: 'emp-1',
        payrollPeriod: currentYearMonth(),
      });

      const result = await service.updateExpense('e1', {
        category: ExpenseCategory.OTHER,
      });

      expect(result.employeeId).toBeNull();
      expect(employeeRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('removeExpense — salary sync', () => {
    it('resets the employee salary to null when the CURRENT month linked SALARIES expense is deleted', async () => {
      expenseRepo.findOne.mockResolvedValue({
        id: 'e1',
        category: ExpenseCategory.SALARIES,
        employeeId: 'emp-1',
        payrollPeriod: currentYearMonth(),
      });

      await service.removeExpense('e1');

      expect(employeeRepo.update).toHaveBeenCalledWith('emp-1', {
        salary: null,
      });
    });

    it('does NOT reset employees.salary when deleting a PAST month SALARIES expense', async () => {
      expenseRepo.findOne.mockResolvedValue({
        id: 'e1',
        category: ExpenseCategory.SALARIES,
        employeeId: 'emp-1',
        payrollPeriod: '2020-01',
      });

      await service.removeExpense('e1');

      expect(employeeRepo.update).not.toHaveBeenCalled();
    });

    it('does not touch any employee when deleting a non-SALARIES expense', async () => {
      expenseRepo.findOne.mockResolvedValue({
        id: 'e1',
        category: ExpenseCategory.OTHER,
        employeeId: null,
        expenseDate: '2026-07-01',
      });

      await service.removeExpense('e1');

      expect(employeeRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('findAllExpenses — salary redaction', () => {
    it('excludes SALARIES rows by default (no canViewSalary)', async () => {
      const qb = makeQb([]);
      expenseRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllExpenses({});

      expect(qb.andWhere).toHaveBeenCalledWith('e.category != :salaries', {
        salaries: ExpenseCategory.SALARIES,
      });
    });

    it('does not filter out SALARIES rows when canViewSalary is true', async () => {
      const qb = makeQb([]);
      expenseRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllExpenses({ canViewSalary: true });

      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'e.category != :salaries',
        expect.anything(),
      );
    });
  });

  describe('period locking', () => {
    it('rejects createExpense when the target period is closed', async () => {
      periodRepo.findOne.mockResolvedValue({
        status: FinancePeriodStatus.CLOSED,
      });

      await expect(
        service.createExpense({
          category: ExpenseCategory.OTHER,
          label: 'Loyer',
          amount: 500,
          expenseDate: '2026-06-15',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects updateExpense when the row belongs to a closed period', async () => {
      expenseRepo.findOne.mockResolvedValue({
        id: 'e1',
        category: ExpenseCategory.OTHER,
        employeeId: null,
        payrollPeriod: null,
        expenseDate: '2026-06-15',
      });
      periodRepo.findOne.mockResolvedValue({
        status: FinancePeriodStatus.CLOSED,
      });

      await expect(
        service.updateExpense('e1', { amount: 700 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(expenseRepo.save).not.toHaveBeenCalled();
    });

    it('rejects removeExpense when the row belongs to a closed period', async () => {
      expenseRepo.findOne.mockResolvedValue({
        id: 'e1',
        category: ExpenseCategory.OTHER,
        employeeId: null,
        payrollPeriod: null,
        expenseDate: '2026-06-15',
      });
      periodRepo.findOne.mockResolvedValue({
        status: FinancePeriodStatus.CLOSED,
      });

      await expect(service.removeExpense('e1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(expenseRepo.delete).not.toHaveBeenCalled();
    });

    it('allows createExpense/updateExpense/removeExpense when the period is open', async () => {
      periodRepo.findOne.mockResolvedValue(null); // ouverte
      expenseRepo.findOne.mockResolvedValue({
        id: 'e1',
        category: ExpenseCategory.OTHER,
        employeeId: null,
        payrollPeriod: null,
        expenseDate: '2026-07-15',
      });

      await expect(
        service.updateExpense('e1', { amount: 700 }),
      ).resolves.toBeDefined();
      await expect(service.removeExpense('e1')).resolves.toBeUndefined();
    });
  });

  describe('correctExpense', () => {
    const closedOriginal = () => ({
      id: 'orig-1',
      category: ExpenseCategory.OTHER,
      label: 'Loyer juin',
      amount: '1000.00',
      expenseDate: '2026-06-01',
      companyId: 'co-1',
      employeeId: null,
      payrollPeriod: null,
      notes: null,
      reversalOfId: null,
    });

    it('never mutates the original row', async () => {
      const original = closedOriginal();
      expenseRepo.findOne.mockResolvedValue(original);

      await service.correctExpense('orig-1', {
        reason: 'Montant erroné',
        amount: 1200,
      });

      expect(expenseRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: 'orig-1', amount: 1200 }),
      );
    });

    it('creates a reversal row with the negated original amount, linked via reversalOfId', async () => {
      const original = closedOriginal();
      expenseRepo.findOne.mockResolvedValue(original);

      const result = await service.correctExpense('orig-1', {
        reason: 'Montant erroné',
        amount: 1200,
      });

      expect(result.reversal.amount).toBe(-1000);
      expect(result.reversal.reversalOfId).toBe('orig-1');
    });

    it('creates a replacement row with the corrected values, also linked via reversalOfId', async () => {
      const original = closedOriginal();
      expenseRepo.findOne.mockResolvedValue(original);

      const result = await service.correctExpense('orig-1', {
        reason: 'Montant erroné',
        amount: 1200,
      });

      expect(result.replacement).not.toBeNull();
      expect(result.replacement?.amount).toBe(1200);
      expect(result.replacement?.reversalOfId).toBe('orig-1');
    });

    it('creates only the reversal row when cancel is true (no replacement)', async () => {
      const original = closedOriginal();
      expenseRepo.findOne.mockResolvedValue(original);

      const result = await service.correctExpense('orig-1', {
        reason: 'Dépense annulée',
        cancel: true,
      });

      expect(result.replacement).toBeNull();
      expect(expenseRepo.save).toHaveBeenCalledTimes(1);
    });

    it('resyncs employees.salary from the replacement when the corrected row is the current-month SALARIES entry', async () => {
      expenseRepo.findOne.mockResolvedValue({
        ...closedOriginal(),
        category: ExpenseCategory.SALARIES,
        employeeId: 'emp-1',
        companyId: null,
      });

      await service.correctExpense('orig-1', {
        reason: 'Rattrapage',
        amount: 3200,
      });

      expect(employeeRepo.update).toHaveBeenCalledWith('emp-1', {
        salary: 3200,
      });
    });
  });

  describe('period management', () => {
    it('getPeriodStatus defaults to OPEN when no row exists', async () => {
      periodRepo.findOne.mockResolvedValue(null);
      const status = await service.getPeriodStatus('2026-07');
      expect(status).toEqual({
        period: '2026-07',
        status: FinancePeriodStatus.OPEN,
        closedAt: null,
      });
    });

    it('closePeriod creates/updates the row to CLOSED with the actor and timestamp', async () => {
      periodRepo.findOne.mockResolvedValue(null);
      periodRepo.create.mockImplementation((v: unknown) => v);
      periodRepo.save.mockImplementation((v: unknown) => v);

      const status = await service.closePeriod('2026-07', 'actor-sub-1');

      expect(status.status).toBe(FinancePeriodStatus.CLOSED);
      expect(status.closedAt).not.toBeNull();
      expect(periodRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          period: '2026-07',
          status: FinancePeriodStatus.CLOSED,
          closedBy: 'actor-sub-1',
        }),
      );
    });

    it('reopenPeriod resets the row to OPEN', async () => {
      periodRepo.findOne.mockResolvedValue({
        period: '2026-07',
        status: FinancePeriodStatus.CLOSED,
        closedAt: new Date('2026-07-05'),
        closedBy: 'actor-sub-1',
      });
      periodRepo.save.mockImplementation((v: unknown) => v);

      const status = await service.reopenPeriod('2026-07');

      expect(status).toEqual({
        period: '2026-07',
        status: FinancePeriodStatus.OPEN,
        closedAt: null,
      });
    });
  });

  describe('debt status derivation (via createDebt/updateDebt mapping)', () => {
    const buildDebt = (overrides: Record<string, unknown>): FinanceDebt =>
      ({
        id: 'd1',
        creditorName: 'Fournisseur X',
        totalAmount: '1000.00',
        remainingAmount: '1000.00',
        dueDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      }) as unknown as FinanceDebt;

    it('is PAID once remainingAmount reaches zero', async () => {
      debtRepo.findOne.mockResolvedValue(
        buildDebt({ remainingAmount: '0.00' }),
      );
      const result = await service.updateDebt('d1', {});
      expect(result.status).toBe(DerivedDebtStatus.PAID);
    });

    it('is OVERDUE when dueDate has passed and a balance remains', async () => {
      debtRepo.findOne.mockResolvedValue(
        buildDebt({ remainingAmount: '500.00', dueDate: '2020-01-01' }),
      );
      const result = await service.updateDebt('d1', {});
      expect(result.status).toBe(DerivedDebtStatus.OVERDUE);
    });

    it('is PARTIALLY_PAID when some but not all has been repaid and not overdue', async () => {
      debtRepo.findOne.mockResolvedValue(
        buildDebt({ remainingAmount: '400.00', totalAmount: '1000.00' }),
      );
      const result = await service.updateDebt('d1', {});
      expect(result.status).toBe(DerivedDebtStatus.PARTIALLY_PAID);
    });

    it('is PENDING when nothing has been repaid yet', async () => {
      debtRepo.findOne.mockResolvedValue(
        buildDebt({ remainingAmount: '1000.00', totalAmount: '1000.00' }),
      );
      const result = await service.updateDebt('d1', {});
      expect(result.status).toBe(DerivedDebtStatus.PENDING);
    });
  });

  describe('contract isExpired derivation', () => {
    it('flags a contract whose endDate is in the past as expired', async () => {
      contractRepo.findOne.mockResolvedValue({
        id: 'c1',
        companyId: 'co-1',
        label: 'Contrat annuel',
        startDate: '2020-01-01',
        endDate: '2020-12-31',
        amount: '1000.00',
        billingFrequency: 'YEARLY',
        status: ContractStatus.ACTIVE,
        notes: null,
      });

      const result = await service.updateContract('c1', {});
      expect(result.isExpired).toBe(true);
    });
  });
});
