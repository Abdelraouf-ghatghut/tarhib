/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PerformanceManagementService } from './performance-management.service.js';
import {
  BudgetStatus,
  ForecastKind,
  InvoiceStatus,
} from './entities/performance.entities.js';

const repo = () => ({
  create: jest.fn((value) => value),
  save: jest.fn(async (value) => ({
    id: value.id ?? 'generated-id',
    ...value,
  })),
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue({ actual: '0' }),
    getRawMany: jest.fn().mockResolvedValue([]),
  })),
});

describe('PerformanceManagementService', () => {
  const invoices = repo();
  const payments = repo();
  const recognitions = repo();
  const budgets = repo();
  const costs = repo();
  const feedback = repo();
  const attendance = repo();
  const forecasts = repo();
  const orders = repo();
  const orderLines = repo();
  const inventory = repo();
  const products = repo();
  const bookings = repo();
  const expenses = repo();
  const accounts = repo();
  const accounting = {
    postInvoiceEntry: jest.fn(),
    postInvoicePaymentEntry: jest.fn(),
    postRevenueRecognitionEntry: jest.fn(),
  };
  const service = new PerformanceManagementService(
    invoices as never,
    payments as never,
    recognitions as never,
    budgets as never,
    costs as never,
    feedback as never,
    attendance as never,
    forecasts as never,
    orders as never,
    orderLines as never,
    inventory as never,
    products as never,
    bookings as never,
    expenses as never,
    accounts as never,
    accounting as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('calculates invoice subtotal, discounts and tax deterministically', async () => {
    const result = await service.createInvoice({
      companyId: '11111111-1111-4111-8111-111111111111',
      issueDate: '2026-08-01',
      dueDate: '2026-08-31',
      serviceFrom: '2026-08-01',
      serviceTo: '2026-08-31',
      lines: [
        {
          description: 'Service',
          quantity: 2,
          unitPrice: 100,
          discount: 20,
          taxRate: 10,
        },
      ],
    });
    expect(result.subtotal).toBe(180);
    expect(result.taxAmount).toBe(18);
    expect(result.totalAmount).toBe(198);
    expect(result.status).toBe(InvoiceStatus.DRAFT);
  });

  it('sums budget lines and starts a budget in DRAFT', async () => {
    const result = await service.createBudget({
      fiscalYear: 2026,
      lines: [
        { period: '2026-01', costCenter: 'OPS', amount: 100 },
        { period: '2026-02', costCenter: 'OPS', amount: 250.55 },
      ],
    });
    expect(result.totalAmount).toBe(350.55);
    expect(result.status).toBe(BudgetStatus.DRAFT);
  });

  it('rejects an invalid budget transition', async () => {
    budgets.findOne.mockResolvedValue({ id: 'b1', status: BudgetStatus.DRAFT });
    await expect(
      service.setBudgetStatus('b1', BudgetStatus.LOCKED),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects feedback for a target outside the supplied company', async () => {
    orders.findOne.mockResolvedValue({
      id: 'o1',
      companyId: 'other-company',
      employeeId: 'e1',
    });
    await expect(
      service.createFeedback({
        companyId: 'company',
        orderId: 'o1',
        employeeId: 'e1',
        rating: 5,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('generates bounded and explainable forecasts', async () => {
    forecasts.save.mockImplementation(async (value) => value);
    const rows = await service.generateForecast({
      kind: ForecastKind.DEMAND,
      horizonDays: 2,
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].lowerBound).toBeLessThanOrEqual(rows[0].predictedValue);
    expect(rows[0].upperBound).toBeGreaterThanOrEqual(rows[0].predictedValue);
    expect(rows[0].factors).toMatchObject({ weights: [0.4, 0.3, 0.2, 0.1] });
  });
});
