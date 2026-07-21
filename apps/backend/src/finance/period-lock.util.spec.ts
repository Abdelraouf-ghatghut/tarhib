import { expensePeriodOf, isPeriodClosed } from './period-lock.util.js';
import { FinancePeriodStatus } from './entities/finance-period.entity.js';

describe('expensePeriodOf', () => {
  it('uses payrollPeriod when set', () => {
    expect(
      expensePeriodOf({ payrollPeriod: '2026-05', expenseDate: '2026-07-01' }),
    ).toBe('2026-05');
  });

  it('falls back to the YYYY-MM slice of expenseDate otherwise', () => {
    expect(
      expensePeriodOf({ payrollPeriod: null, expenseDate: '2026-07-15' }),
    ).toBe('2026-07');
  });
});

describe('isPeriodClosed', () => {
  const periodRepo = { findOne: jest.fn() };

  it('returns false when no row exists for the period (open by default)', async () => {
    periodRepo.findOne.mockResolvedValue(null);
    await expect(isPeriodClosed(periodRepo as never, '2026-07')).resolves.toBe(
      false,
    );
  });

  it('returns false when the row status is OPEN', async () => {
    periodRepo.findOne.mockResolvedValue({ status: FinancePeriodStatus.OPEN });
    await expect(isPeriodClosed(periodRepo as never, '2026-07')).resolves.toBe(
      false,
    );
  });

  it('returns true when the row status is CLOSED', async () => {
    periodRepo.findOne.mockResolvedValue({
      status: FinancePeriodStatus.CLOSED,
    });
    await expect(isPeriodClosed(periodRepo as never, '2026-07')).resolves.toBe(
      true,
    );
  });
});
