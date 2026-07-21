import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FinancePayrollService } from './finance-payroll.service.js';
import { FinancePeriodStatus } from './entities/finance-period.entity.js';
import {
  Employee,
  EmployeeScope,
} from '../employees/entities/employee.entity.js';
import {
  ExpenseCategory,
  FinanceExpense,
} from './entities/finance-expense.entity.js';
import { FinancePeriod } from './entities/finance-period.entity.js';
import { PayslipService } from '../hr/payslip.service.js';
import { AccountingService } from '../accounting/accounting.service.js';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => v),
});

const mockPayslipService = () => ({
  getConfig: jest.fn().mockResolvedValue({
    incomeTaxBracket1Rate: 5,
    incomeTaxBracket1Ceiling: 1000,
    incomeTaxBracket2Rate: 10,
    personalExemptionThreshold: 0,
    jihadTaxIndividualRate: 3,
    solidarityFundRate: 1,
    payrollStampDutyRate: 0.5,
    cnssEmployeeRate: 5.125,
    cnssEmployerRate: 14.35,
  }),
  compute: jest.fn().mockReturnValue({
    cnssEmployeeContribution: 100,
    cnssEmployerContribution: 200,
    solidarityFundAmount: 10,
    jihadTaxAmount: 30,
    incomeTaxAmount: 150,
    stampDutyAmount: 8,
    netPay: 2500,
  }),
  createPayslip: jest.fn().mockResolvedValue({ id: 'payslip-1' }),
});

const mockAccountingService = () => ({
  postPayrollEntry: jest.fn().mockResolvedValue(undefined),
});

const baseEmployee = (overrides: Record<string, unknown> = {}) => ({
  id: 'emp-1',
  scope: EmployeeScope.TARHIB,
  active: true,
  salary: '3000.00',
  hireDate: null,
  companyId: null,
  firstNameEn: 'Mohamed',
  lastNameEn: 'Ali',
  email: 'm.ali@tarhib.com',
  ...overrides,
});

describe('FinancePayrollService', () => {
  let service: FinancePayrollService;
  let employeeRepo: ReturnType<typeof mockRepo>;
  let expenseRepo: ReturnType<typeof mockRepo>;
  let periodRepo: ReturnType<typeof mockRepo>;
  let payslipService: ReturnType<typeof mockPayslipService>;
  let accountingService: ReturnType<typeof mockAccountingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancePayrollService,
        { provide: getRepositoryToken(Employee), useFactory: mockRepo },
        { provide: getRepositoryToken(FinanceExpense), useFactory: mockRepo },
        { provide: getRepositoryToken(FinancePeriod), useFactory: mockRepo },
        { provide: PayslipService, useFactory: mockPayslipService },
        { provide: AccountingService, useFactory: mockAccountingService },
      ],
    }).compile();

    service = module.get(FinancePayrollService);
    employeeRepo = module.get(getRepositoryToken(Employee));
    expenseRepo = module.get(getRepositoryToken(FinanceExpense));
    periodRepo = module.get(getRepositoryToken(FinancePeriod));
    payslipService = module.get(PayslipService);
    accountingService = module.get(AccountingService);
    periodRepo.findOne.mockResolvedValue(null); // toute période ouverte par défaut
  });

  it('creates a SALARIES row for each salaried active TARHIB employee without one yet', async () => {
    employeeRepo.find.mockResolvedValue([baseEmployee()]);
    expenseRepo.findOne.mockResolvedValue(null);

    const result = await service.runPayroll('2026-07');

    expect(result).toEqual({ created: 1, skipped: 0 });
    expect(expenseRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        category: ExpenseCategory.SALARIES,
        employeeId: 'emp-1',
        payrollPeriod: '2026-07',
        amount: 3000,
      }),
    );
    expect(payslipService.compute).toHaveBeenCalledWith(
      3000,
      expect.objectContaining({ cnssEmployeeRate: 5.125 }),
    );
    expect(payslipService.createPayslip).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 'emp-1', period: '2026-07' }),
    );
    expect(accountingService.postPayrollEntry).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'payslip-1', grossSalary: 3000 }),
    );
  });

  it('still counts the expense as created if payslip generation fails', async () => {
    employeeRepo.find.mockResolvedValue([baseEmployee()]);
    expenseRepo.findOne.mockResolvedValue(null);
    payslipService.compute.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const result = await service.runPayroll('2026-07');

    expect(result).toEqual({ created: 1, skipped: 0 });
  });

  it('never links the employee assignment site (companyId) to the salary expense', async () => {
    // Site d'affectation renseigné (mission) — le salaire ne doit jamais en
    // hériter, c'est une mission, pas un lien financier.
    employeeRepo.find.mockResolvedValue([baseEmployee({ companyId: 'co-1' })]);
    expenseRepo.findOne.mockResolvedValue(null);

    await service.runPayroll('2026-07');

    expect(expenseRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: null }),
    );
  });

  it('skips employees who already have a row for that period', async () => {
    employeeRepo.find.mockResolvedValue([baseEmployee()]);
    expenseRepo.findOne.mockResolvedValue({ id: 'exp-1' });

    const result = await service.runPayroll('2026-07');

    expect(result).toEqual({ created: 0, skipped: 1 });
    expect(expenseRepo.save).not.toHaveBeenCalled();
  });

  it('skips employees without a salary', async () => {
    employeeRepo.find.mockResolvedValue([baseEmployee({ salary: null })]);

    const result = await service.runPayroll('2026-07');

    expect(result).toEqual({ created: 0, skipped: 1 });
    expect(expenseRepo.save).not.toHaveBeenCalled();
  });

  it('skips employees whose hireDate is after the requested period', async () => {
    employeeRepo.find.mockResolvedValue([
      baseEmployee({ hireDate: '2026-09-01' }),
    ]);
    expenseRepo.findOne.mockResolvedValue(null);

    const result = await service.runPayroll('2026-07');

    expect(result).toEqual({ created: 0, skipped: 1 });
    expect(expenseRepo.save).not.toHaveBeenCalled();
  });

  it('prorates the amount for an employee hired mid-period', async () => {
    employeeRepo.find.mockResolvedValue([
      baseEmployee({ hireDate: '2026-07-16', salary: '3100.00' }),
    ]);
    expenseRepo.findOne.mockResolvedValue(null);

    await service.runPayroll('2026-07');

    expect(expenseRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ amount: (3100 * 16) / 31 }),
    );
  });

  it('only considers active TARHIB employees', async () => {
    employeeRepo.find.mockResolvedValue([]);

    await service.runPayroll('2026-07');

    expect(employeeRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scope: EmployeeScope.TARHIB, active: true },
      }),
    );
  });

  it('rejects runPayroll when the target period is closed', async () => {
    periodRepo.findOne.mockResolvedValue({
      status: FinancePeriodStatus.CLOSED,
    });

    await expect(service.runPayroll('2026-07')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(employeeRepo.find).not.toHaveBeenCalled();
  });
});
