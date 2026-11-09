import { filterTransactions, spentInCategory } from '@/domain/analytics';
import { alertKey, crossedThresholds } from '@/domain/budgets';
import { cycleConfigFromSettings, getCycle } from '@/domain/cycle';
import { fromLocalISO } from '@/domain/dates';
import { formatMoney, percent } from '@/domain/money';
import type { AppState } from '@/store/useStore';
import { sendBudgetAlert } from './notifications';

export interface BudgetAlertMessage {
  key: string;
  title: string;
  body: string;
}

/**
 * Pure: given the state before and after a transaction change, returns alerts that should fire.
 * The caller logs the keys and sends them.
 */
export function computeBudgetAlerts(before: Pick<AppState, 'transactions'>, after: Pick<AppState, 'transactions' | 'budgets' | 'settings' | 'categories' | 'alertLog'>, categoryId: string | undefined, txnDate: string): BudgetAlertMessage[] {
  if (!categoryId || !after.settings.budgetAlerts.enabled) return [];
  const budget = after.budgets.find((b) => b.categoryId === categoryId);
  if (!budget) return [];
  const cycle = getCycle(fromLocalISO(txnDate), cycleConfigFromSettings(after.settings));
  const spentBefore = spentInCategory(filterTransactions(before.transactions, { range: cycle }), categoryId);
  const spentAfter = spentInCategory(filterTransactions(after.transactions, { range: cycle }), categoryId);
  const pctBefore = percent(spentBefore, budget.amount);
  const pctAfter = percent(spentAfter, budget.amount);
  const alerted = new Set(Object.keys(after.alertLog));
  const crossed = crossedThresholds(pctBefore, pctAfter, after.settings.budgetAlerts.thresholds, alerted, categoryId, cycle.key);
  const name = after.categories.find((c) => c.id === categoryId)?.name ?? 'Category';
  const cur = after.settings.currency;
  return crossed.map((th) => ({
    key: alertKey(categoryId, cycle.key, th),
    title: th >= 100 ? `${name} budget exceeded` : `${name} budget at ${pctAfter}%`,
    body:
      th >= 100
        ? `You've spent ${formatMoney(spentAfter, { currency: cur })} of your ${formatMoney(budget.amount, { currency: cur })} budget this cycle (${cycle.label}).`
        : `${formatMoney(budget.amount - spentAfter, { currency: cur })} left of ${formatMoney(budget.amount, { currency: cur })} for ${cycle.label}.`,
  }));
}

export async function dispatchBudgetAlerts(alerts: BudgetAlertMessage[], logAlert: (key: string) => void, toast?: (msg: string) => void): Promise<void> {
  for (const a of alerts) {
    logAlert(a.key);
    toast?.(`${a.title}. ${a.body}`);
    await sendBudgetAlert(a.title, a.body);
  }
}
