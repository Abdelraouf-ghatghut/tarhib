import {
  computeProratedSalary,
  currentYearMonth,
} from './payroll-period.util.js';

describe('currentYearMonth', () => {
  it('returns the current month in YYYY-MM format', () => {
    expect(currentYearMonth()).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('computeProratedSalary', () => {
  it('returns the full salary when hireDate is null', () => {
    expect(computeProratedSalary(3000, null, '2026-07')).toBe(3000);
  });

  it('returns the full salary when hireDate is before the requested period', () => {
    expect(computeProratedSalary(3000, '2026-01-15', '2026-07')).toBe(3000);
  });

  it('returns null when hireDate is after the requested period', () => {
    expect(computeProratedSalary(3000, '2026-09-01', '2026-07')).toBeNull();
  });

  it('prorates the salary for a mid-month hire', () => {
    // July has 31 days; hired on the 16th → 16 days worked (16..31 inclusive)
    const amount = computeProratedSalary(3100, '2026-07-16', '2026-07');
    expect(amount).toBeCloseTo((3100 * 16) / 31, 2);
  });

  it('returns the full salary for a hire on the first day of the period', () => {
    expect(computeProratedSalary(3000, '2026-07-01', '2026-07')).toBe(3000);
  });
});
