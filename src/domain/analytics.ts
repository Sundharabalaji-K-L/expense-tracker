import { dayKey, fromLocalISO } from './dates';
import { round2 } from './money';
import { inRange } from './cycle';
import type { Account, Category, DateRange, Transaction } from './types';

export interface TxnFilter {
  range?: DateRange;
  accountId?: string | null;
  categoryId?: string | null;
  type?: Transaction['type'] | 'all' | null;
  search?: string;
}

export function filterTransactions(txns: Transaction[], f: TxnFilter, categories?: Category[]): Transaction[] {
  const q = f.search?.trim().toLowerCase();
  const catName = (id?: string) => categories?.find((c) => c.id === id)?.name.toLowerCase() ?? '';
  return txns.filter((t) => {
    if (f.range && !inRange(fromLocalISO(t.date), f.range)) return false;
    if (f.accountId && t.accountId !== f.accountId && t.toAccountId !== f.accountId) return false;
    if (f.categoryId && t.categoryId !== f.categoryId) return false;
    if (f.type && f.type !== 'all' && t.type !== f.type) return false;
    if (q) {
      const hay = `${t.note ?? ''} ${catName(t.categoryId)} ${t.amount}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortByDateDesc(txns: Transaction[]): Transaction[] {
  return [...txns].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)));
}

export interface Totals {
  income: number;
  expense: number;
  net: number;
  transfersIn: number;
  transfersOut: number;
}

/** Income/expense totals. Transfers are never counted as income or expense. */
export function totals(txns: Transaction[], accountId?: string | null): Totals {
  let income = 0;
  let expense = 0;
  let transfersIn = 0;
  let transfersOut = 0;
  for (const t of txns) {
    if (t.type === 'income') {
      if (!accountId || t.accountId === accountId) income += t.amount;
    } else if (t.type === 'expense') {
      if (!accountId || t.accountId === accountId) expense += t.amount;
    } else {
      if (accountId) {
        if (t.accountId === accountId) transfersOut += t.amount;
        if (t.toAccountId === accountId) transfersIn += t.amount;
      }
    }
  }
  return { income: round2(income), expense: round2(expense), net: round2(income - expense), transfersIn: round2(transfersIn), transfersOut: round2(transfersOut) };
}

/** All-time balance of an account: opening + income − expense + transfers in − transfers out. */
export function accountBalance(account: Account, txns: Transaction[]): number {
  let bal = account.openingBalance;
  for (const t of txns) {
    if (t.type === 'income' && t.accountId === account.id) bal += t.amount;
    else if (t.type === 'expense' && t.accountId === account.id) bal -= t.amount;
    else if (t.type === 'transfer') {
      if (t.accountId === account.id) bal -= t.amount;
      if (t.toAccountId === account.id) bal += t.amount;
    }
  }
  return round2(bal);
}

export function netWorth(accounts: Account[], txns: Transaction[]): { total: number; assets: number; liabilities: number } {
  let assets = 0;
  let liabilities = 0;
  for (const a of accounts) {
    if (a.archived) continue;
    const b = accountBalance(a, txns);
    if (b >= 0) assets += b;
    else liabilities += -b;
  }
  return { total: round2(assets - liabilities), assets: round2(assets), liabilities: round2(liabilities) };
}

export interface CategorySlice {
  categoryId: string;
  amount: number;
  count: number;
  share: number;
}

export function expenseByCategory(txns: Transaction[]): CategorySlice[] {
  const map = new Map<string, { amount: number; count: number }>();
  let total = 0;
  for (const t of txns) {
    if (t.type !== 'expense') continue;
    const id = t.categoryId ?? 'cat_others';
    const cur = map.get(id) ?? { amount: 0, count: 0 };
    cur.amount += t.amount;
    cur.count += 1;
    map.set(id, cur);
    total += t.amount;
  }
  return [...map.entries()]
    .map(([categoryId, v]) => ({ categoryId, amount: round2(v.amount), count: v.count, share: total > 0 ? v.amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export function spentInCategory(txns: Transaction[], categoryId: string): number {
  return round2(txns.filter((t) => t.type === 'expense' && t.categoryId === categoryId).reduce((s, t) => s + t.amount, 0));
}

export interface DayPoint {
  key: string;
  date: Date;
  expense: number;
  income: number;
}

/** One point per day of the range, zero-filled. */
export function dailySeries(txns: Transaction[], range: DateRange): DayPoint[] {
  const points: DayPoint[] = [];
  const index = new Map<string, DayPoint>();
  for (let d = new Date(range.start); d < range.end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const p = { key: dayKey(d), date: new Date(d), expense: 0, income: 0 };
    points.push(p);
    index.set(p.key, p);
  }
  for (const t of txns) {
    const p = index.get(t.date.slice(0, 10));
    if (!p) continue;
    if (t.type === 'expense') p.expense = round2(p.expense + t.amount);
    else if (t.type === 'income') p.income = round2(p.income + t.amount);
  }
  return points;
}

/** Weekly buckets (7-day windows from range start). */
export function weeklySeries(txns: Transaction[], range: DateRange): { label: string; start: Date; expense: number; income: number }[] {
  const days = dailySeries(txns, range);
  const out: { label: string; start: Date; expense: number; income: number }[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    out.push({
      label: `W${out.length + 1}`,
      start: chunk[0].date,
      expense: round2(chunk.reduce((s, p) => s + p.expense, 0)),
      income: round2(chunk.reduce((s, p) => s + p.income, 0)),
    });
  }
  return out;
}

export function expenseByAccount(txns: Transaction[], accounts: Account[]): { accountId: string; amount: number }[] {
  return accounts
    .filter((a) => !a.archived)
    .map((a) => ({ accountId: a.id, amount: round2(txns.filter((t) => t.type === 'expense' && t.accountId === a.id).reduce((s, t) => s + t.amount, 0)) }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function groupByDay(txns: Transaction[]): { key: string; date: Date; items: Transaction[]; expense: number; income: number }[] {
  const groups = new Map<string, { key: string; date: Date; items: Transaction[]; expense: number; income: number }>();
  for (const t of sortByDateDesc(txns)) {
    const key = t.date.slice(0, 10);
    let g = groups.get(key);
    if (!g) {
      g = { key, date: fromLocalISO(t.date), items: [], expense: 0, income: 0 };
      groups.set(key, g);
    }
    g.items.push(t);
    if (t.type === 'expense') g.expense = round2(g.expense + t.amount);
    if (t.type === 'income') g.income = round2(g.income + t.amount);
  }
  return [...groups.values()];
}

export function changePercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function hasExpenseOnDay(txns: Transaction[], key: string): boolean {
  return txns.some((t) => t.type === 'expense' && t.date.slice(0, 10) === key);
}
