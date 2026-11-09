import { spentInCategory } from './analytics';
import { round2, percent } from './money';
import type { Budget, Transaction } from './types';

export type BudgetStatus = 'ok' | 'warn' | 'over';

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  pct: number;
  status: BudgetStatus;
}

export function budgetProgress(budget: Budget, cycleTxns: Transaction[], warnAt = 80): BudgetProgress {
  const spent = spentInCategory(cycleTxns, budget.categoryId);
  const pct = percent(spent, budget.amount);
  const status: BudgetStatus = spent > budget.amount ? 'over' : pct >= warnAt ? 'warn' : 'ok';
  return { budget, spent, remaining: round2(budget.amount - spent), pct, status };
}

export function allBudgetProgress(budgets: Budget[], cycleTxns: Transaction[], warnAt = 80): BudgetProgress[] {
  return budgets.map((b) => budgetProgress(b, cycleTxns, warnAt)).sort((a, b) => b.pct - a.pct);
}

export function budgetSummary(progress: BudgetProgress[]): { allocated: number; spent: number; remaining: number; pct: number } {
  const allocated = round2(progress.reduce((s, p) => s + p.budget.amount, 0));
  const spent = round2(progress.reduce((s, p) => s + p.spent, 0));
  return { allocated, spent, remaining: round2(allocated - spent), pct: percent(spent, allocated) };
}

/**
 * Daily spending pace: how much can still be spent per remaining day to end the cycle on budget.
 */
export function dailyAllowance(remaining: number, daysLeft: number): number {
  if (daysLeft <= 0) return 0;
  return round2(Math.max(0, remaining) / daysLeft);
}

export function alertKey(categoryId: string, cycleKey: string, threshold: number): string {
  return `${categoryId}|${cycleKey}|${threshold}`;
}

/**
 * Thresholds newly crossed by moving from `before` percent to `after` percent that have not been alerted.
 */
export function crossedThresholds(beforePct: number, afterPct: number, thresholds: number[], alerted: Set<string>, categoryId: string, cycleKey: string): number[] {
  return thresholds
    .filter((th) => afterPct >= th && beforePct < th)
    .filter((th) => !alerted.has(alertKey(categoryId, cycleKey, th)));
}
