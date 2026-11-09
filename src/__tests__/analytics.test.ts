import { accountBalance, changePercent, dailySeries, expenseByAccount, expenseByCategory, filterTransactions, groupByDay, hasExpenseOnDay, netWorth, totals, weeklySeries } from '@/domain/analytics';
import type { Account, Transaction } from '@/domain/types';

const acc = (id: string, opening = 0, type: Account['type'] = 'bank'): Account => ({ id, name: id, type, openingBalance: opening, color: '#000', icon: 'bank', createdAt: '' });
let n = 0;
const txn = (p: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'accountId' | 'date'>): Transaction => ({ id: `t${++n}`, createdAt: `2026-01-01T00:00:0${n % 10}`, updatedAt: '', ...p });

const bank = acc('bank', 1000);
const cash = acc('cash', 100, 'cash');
const txns: Transaction[] = [
  txn({ type: 'income', amount: 5000, accountId: 'bank', categoryId: 'inc_salary', date: '2026-11-01T09:00:00' }),
  txn({ type: 'expense', amount: 300, accountId: 'bank', categoryId: 'cat_food', date: '2026-11-02T13:00:00', note: 'Lunch' }),
  txn({ type: 'expense', amount: 200, accountId: 'cash', categoryId: 'cat_food', date: '2026-11-02T20:00:00' }),
  txn({ type: 'transfer', amount: 400, accountId: 'bank', toAccountId: 'cash', date: '2026-11-03T10:00:00' }),
  txn({ type: 'expense', amount: 150, accountId: 'cash', categoryId: 'cat_transport', date: '2026-11-04T08:00:00' }),
  txn({ type: 'expense', amount: 1000, accountId: 'bank', categoryId: 'cat_rent', date: '2026-12-02T08:00:00' }),
];
const nov = { start: new Date(2026, 10, 1), end: new Date(2026, 11, 1) };

describe('analytics', () => {
  test('transfers are excluded from income and expense totals', () => {
    const t = totals(filterTransactions(txns, { range: nov }));
    expect(t).toEqual({ income: 5000, expense: 650, net: 4350, transfersIn: 0, transfersOut: 0 });
  });

  test('per-account totals include transfers in and out', () => {
    const t = totals(filterTransactions(txns, { range: nov }), 'cash');
    expect(t.expense).toBe(350);
    expect(t.income).toBe(0);
    expect(t.transfersIn).toBe(400);
    const b = totals(filterTransactions(txns, { range: nov }), 'bank');
    expect(b.transfersOut).toBe(400);
  });

  test('account balances apply opening balance, income, expense and transfers', () => {
    expect(accountBalance(bank, txns)).toBe(1000 + 5000 - 300 - 400 - 1000);
    expect(accountBalance(cash, txns)).toBe(100 - 200 + 400 - 150);
  });

  test('net worth separates assets and liabilities', () => {
    const card = acc('card', -500, 'credit');
    const nw = netWorth([bank, cash, card], txns);
    expect(nw.assets).toBe(4300 + 150);
    expect(nw.liabilities).toBe(500);
    expect(nw.total).toBe(3950);
  });

  test('expenseByCategory sorts by amount and computes share', () => {
    const by = expenseByCategory(filterTransactions(txns, { range: nov }));
    expect(by[0]).toMatchObject({ categoryId: 'cat_food', amount: 500, count: 2 });
    expect(by[0].share).toBeCloseTo(500 / 650);
    expect(by[1].categoryId).toBe('cat_transport');
  });

  test('filters by account (either side of a transfer), category, type and search', () => {
    expect(filterTransactions(txns, { accountId: 'cash' })).toHaveLength(3); // 2 expenses + the incoming transfer
    expect(filterTransactions(txns, { accountId: 'bank' })).toHaveLength(4);
    expect(filterTransactions(txns, { categoryId: 'cat_food' })).toHaveLength(2);
    expect(filterTransactions(txns, { type: 'transfer' })).toHaveLength(1);
    expect(filterTransactions(txns, { type: 'all' })).toHaveLength(6);
    expect(filterTransactions(txns, { search: 'lunch' })).toHaveLength(1);
    expect(filterTransactions(txns, { search: '150' })).toHaveLength(1);
  });

  test('daily series is zero-filled over the whole range', () => {
    const days = dailySeries(filterTransactions(txns, { range: nov }), nov);
    expect(days).toHaveLength(30);
    expect(days[1]).toMatchObject({ key: '2026-11-02', expense: 500 });
    expect(days[0]).toMatchObject({ key: '2026-11-01', income: 5000, expense: 0 });
    expect(days[29].expense).toBe(0);
  });

  test('weekly series buckets 7 days at a time', () => {
    const weeks = weeklySeries(filterTransactions(txns, { range: nov }), nov);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toMatchObject({ label: 'W1', expense: 650, income: 5000 });
  });

  test('expenseByAccount and groupByDay', () => {
    const by = expenseByAccount(filterTransactions(txns, { range: nov }), [bank, cash]);
    expect(by).toEqual([{ accountId: 'cash', amount: 350 }, { accountId: 'bank', amount: 300 }]);
    const groups = groupByDay(filterTransactions(txns, { range: nov }));
    expect(groups.map((g) => g.key)).toEqual(['2026-11-04', '2026-11-03', '2026-11-02', '2026-11-01']);
    expect(groups[2].expense).toBe(500);
  });

  test('changePercent and hasExpenseOnDay', () => {
    expect(changePercent(120, 100)).toBe(20);
    expect(changePercent(80, 100)).toBe(-20);
    expect(changePercent(10, 0)).toBeNull();
    expect(hasExpenseOnDay(txns, '2026-11-02')).toBe(true);
    expect(hasExpenseOnDay(txns, '2026-11-01')).toBe(false); // income only
  });
});
