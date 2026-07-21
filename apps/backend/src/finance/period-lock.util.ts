import { Repository } from 'typeorm';
import { FinanceExpense } from './entities/finance-expense.entity.js';
import {
  FinancePeriod,
  FinancePeriodStatus,
} from './entities/finance-period.entity.js';

/** Mois ('YYYY-MM') auquel appartient une dépense — payrollPeriod pour les
 * salaires, sinon dérivé de expenseDate. */
export function expensePeriodOf(
  e: Pick<FinanceExpense, 'payrollPeriod' | 'expenseDate'>,
): string {
  return e.payrollPeriod ?? e.expenseDate.slice(0, 7);
}

/** Absence de ligne pour un mois = période ouverte. */
export async function isPeriodClosed(
  periodRepo: Repository<FinancePeriod>,
  period: string,
): Promise<boolean> {
  const row = await periodRepo.findOne({ where: { period } });
  return row?.status === FinancePeriodStatus.CLOSED;
}
