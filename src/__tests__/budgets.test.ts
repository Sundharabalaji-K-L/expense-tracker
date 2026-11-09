import { alertKey, allBudgetProgress, budgetProgress, budgetSummary, crossedThresholds, dailyAllowance } from '@/domain/budgets';
import { computeBudgetAlerts } from '@/services/budgetAlerts';
import { DEFAULT_CATEGORIES } from '@/domain/defaults';
import { DEFAULT_SETTINGS, type Budget, type Transaction } from '@/domain/types';

let n = 0;
const exp = (amount: number, categoryId: string, date = '2026-11-05T12:00:00'): Transaction => ({ id: `t${++n}`, type: 'expense', amount, accountId: 'a', categoryId, date, createdAt: '', updatedAt: '' });
const food: Budget = { id: 'b1', categoryId: 'cat_food', amount: 1000 };
const rent: Budget = { id: 'b2', categoryId: 'cat_rent', amount: 20000 };

describe('budgets', () => {
  test('progress status: ok / warn / over', () => {
    expect(budgetProgress(food, [exp(300, 'cat_food')])).toMatchObject({ spent: 300, remaining: 700, pct: 30, status: 'ok' });
    expect(budgetProgress(food, [exp(850, 'cat_food')])).toMatchObject({ pct: 85, status: 'warn' });
    expect(budgetProgress(food, [exp(1000, 'cat_food')])).toMatchObject({ pct: 100, status: 'warn', remaining: 0 });
    expect(budgetProgress(food, [exp(1200, 'cat_food')])).toMatchObject({ status: 'over', remaining: -200 });
    expect(budgetProgress(food, [exp(300, 'cat_food')], 25).status).toBe('warn');
  });

  test('summary aggregates and sorts by usage', () => {
    const p = allBudgetProgress([food, rent], [exp(900, 'cat_food'), exp(5000, 'cat_rent')]);
    expect(p[0].budget.categoryId).toBe('cat_food');
    expect(budgetSummary(p)).toEqual({ allocated: 21000, spent: 5900, remaining: 15100, pct: 28 });
  });

  test('daily allowance', () => {
    expect(dailyAllowance(700, 7)).toBe(100);
    expect(dailyAllowance(-50, 7)).toBe(0);
    expect(dailyAllowance(700, 0)).toBe(0);
  });

  test('crossedThresholds fires each threshold once', () => {
    const alerted = new Set<string>();
    expect(crossedThresholds(70, 85, [80, 100], alerted, 'c', 'k')).toEqual([80]);
    expect(crossedThresholds(70, 120, [80, 100], alerted, 'c', 'k')).toEqual([80, 100]);
    alerted.add(alertKey('c', 'k', 80));
    expect(crossedThresholds(70, 120, [80, 100], alerted, 'c', 'k')).toEqual([100]);
    expect(crossedThresholds(85, 90, [80, 100], new Set(), 'c', 'k')).toEqual([]);
  });

  test('computeBudgetAlerts builds messages scoped to the cycle of the transaction', () => {
    const before = { transactions: [exp(700, 'cat_food')] };
    const after = { transactions: [...before.transactions, exp(200, 'cat_food')], budgets: [food], settings: { ...DEFAULT_SETTINGS, cycleMode: 'calendar' as const }, categories: DEFAULT_CATEGORIES, alertLog: {} };
    const alerts = computeBudgetAlerts(before, after, 'cat_food', '2026-11-05T12:00:00');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].key).toBe('cat_food|2026-11-01|80');
    expect(alerts[0].title).toMatch(/Food & Dining budget at 90%/);
    expect(alerts[0].body).toMatch(/₹100 left of ₹1,000/);

    // Already alerted → nothing
    expect(computeBudgetAlerts(before, { ...after, alertLog: { 'cat_food|2026-11-01|80': true } }, 'cat_food', '2026-11-05T12:00:00')).toEqual([]);
    // Alerts disabled → nothing
    expect(computeBudgetAlerts(before, { ...after, settings: { ...after.settings, budgetAlerts: { enabled: false, thresholds: [80] } } }, 'cat_food', '2026-11-05T12:00:00')).toEqual([]);
    // Different cycle (an October transaction) → no alert, since October spend is 0
    expect(computeBudgetAlerts(before, after, 'cat_food', '2026-10-05T12:00:00')).toEqual([]);
    // No budget for category → nothing
    expect(computeBudgetAlerts(before, after, 'cat_transport', '2026-11-05T12:00:00')).toEqual([]);
  });

  test('exceeding 100% produces an "exceeded" alert', () => {
    const before = { transactions: [exp(900, 'cat_food')] };
    const after = { transactions: [...before.transactions, exp(300, 'cat_food')], budgets: [food], settings: { ...DEFAULT_SETTINGS, cycleMode: 'calendar' as const }, categories: DEFAULT_CATEGORIES, alertLog: { 'cat_food|2026-11-01|80': true as const } };
    const alerts = computeBudgetAlerts(before, after, 'cat_food', '2026-11-05T12:00:00');
    expect(alerts.map((a) => a.key)).toEqual(['cat_food|2026-11-01|100']);
    expect(alerts[0].title).toBe('Food & Dining budget exceeded');
  });
});
