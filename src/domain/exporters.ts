import { format } from 'date-fns';
import { expenseByCategory, totals, sortByDateDesc } from './analytics';
import type { BudgetProgress } from './budgets';
import { fromLocalISO } from './dates';
import { formatMoney } from './money';
import type { Account, Category, Transaction } from './types';

export interface ExportContext {
  accounts: Account[];
  categories: Category[];
  currency: string;
  rangeLabel: string;
}

function csvCell(v: string | number | undefined): string {
  const s = v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsToCSV(txns: Transaction[], ctx: ExportContext): string {
  const acc = (id?: string) => ctx.accounts.find((a) => a.id === id)?.name ?? '';
  const cat = (id?: string) => ctx.categories.find((c) => c.id === id);
  const header = ['Date', 'Time', 'Type', 'Amount', 'Category', 'Subcategory', 'Account', 'To Account', 'Note'];
  const rows = sortByDateDesc(txns).map((t) => {
    const d = fromLocalISO(t.date);
    const c = cat(t.categoryId);
    const sub = c?.subcategories.find((s) => s.id === t.subcategoryId)?.name ?? '';
    return [
      format(d, 'yyyy-MM-dd'),
      format(d, 'HH:mm'),
      t.type,
      t.amount.toFixed(2),
      c?.name ?? '',
      sub,
      acc(t.accountId),
      t.type === 'transfer' ? acc(t.toAccountId) : '',
      t.note ?? '',
    ].map(csvCell).join(',');
  });
  return [header.join(','), ...rows].join('\n');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function reportToHTML(txns: Transaction[], budgets: BudgetProgress[], ctx: ExportContext): string {
  const t = totals(txns);
  const byCat = expenseByCategory(txns);
  const cat = (id?: string) => ctx.categories.find((c) => c.id === id);
  const acc = (id?: string) => ctx.accounts.find((a) => a.id === id)?.name ?? '';
  const money = (n: number) => formatMoney(n, { currency: ctx.currency, decimals: 'always' });

  const catRows = byCat
    .map((s) => `<tr><td><span class="sw" style="background:${cat(s.categoryId)?.color ?? '#999'}"></span>${esc(cat(s.categoryId)?.name ?? 'Other')}</td><td class="r">${s.count}</td><td class="r">${money(s.amount)}</td><td class="r">${Math.round(s.share * 100)}%</td></tr>`)
    .join('');

  const budgetRows = budgets
    .map((b) => `<tr><td>${esc(cat(b.budget.categoryId)?.name ?? '')}</td><td class="r">${money(b.budget.amount)}</td><td class="r">${money(b.spent)}</td><td class="r">${money(b.remaining)}</td><td class="r ${b.status}">${b.pct}%</td></tr>`)
    .join('');

  const txnRows = sortByDateDesc(txns)
    .map((x) => {
      const d = fromLocalISO(x.date);
      const c = cat(x.categoryId);
      const label = x.type === 'transfer' ? `Transfer → ${esc(acc(x.toAccountId))}` : esc(c?.name ?? '');
      const sign = x.type === 'expense' ? '−' : x.type === 'income' ? '+' : '';
      return `<tr><td>${format(d, 'd MMM yyyy')}<br><small>${format(d, 'h:mm a')}</small></td><td>${label}${x.note ? `<br><small>${esc(x.note)}</small>` : ''}</td><td>${esc(acc(x.accountId))}</td><td class="r ${x.type}">${sign}${money(x.amount)}</td></tr>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Expense report</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1220;margin:32px;font-size:12px}
  h1{font-size:22px;margin:0 0 4px}h2{font-size:14px;margin:26px 0 8px;border-bottom:1px solid #e5e8ee;padding-bottom:6px}
  .sub{color:#6b7280;margin-bottom:18px}
  .kpis{display:flex;gap:12px}.kpi{flex:1;border:1px solid #e5e8ee;border-radius:10px;padding:10px 12px}
  .kpi .k{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px}.kpi .v{font-size:18px;font-weight:700;margin-top:4px}
  table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #eef0f4;vertical-align:top}
  th{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px}.r{text-align:right}
  .sw{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px}
  .income{color:#0a7a44}.expense{color:#b92f2f}.transfer{color:#5542b8}.over{color:#b92f2f;font-weight:700}.warn{color:#9a5b00;font-weight:700}
  small{color:#6b7280}
</style></head><body>
<h1>Expense report</h1><div class="sub">${esc(ctx.rangeLabel)} · Generated ${format(new Date(), 'd MMM yyyy, h:mm a')}</div>
<div class="kpis">
  <div class="kpi"><div class="k">Income</div><div class="v income">${money(t.income)}</div></div>
  <div class="kpi"><div class="k">Expenses</div><div class="v expense">${money(t.expense)}</div></div>
  <div class="kpi"><div class="k">Net savings</div><div class="v">${money(t.net)}</div></div>
</div>
<h2>Spending by category</h2>
<table><thead><tr><th>Category</th><th class="r">Entries</th><th class="r">Amount</th><th class="r">Share</th></tr></thead><tbody>${catRows || '<tr><td colspan="4">No expenses</td></tr>'}</tbody></table>
${budgets.length ? `<h2>Budgets</h2><table><thead><tr><th>Category</th><th class="r">Budget</th><th class="r">Spent</th><th class="r">Remaining</th><th class="r">Used</th></tr></thead><tbody>${budgetRows}</tbody></table>` : ''}
<h2>Transactions (${txns.length})</h2>
<table><thead><tr><th>Date</th><th>Details</th><th>Account</th><th class="r">Amount</th></tr></thead><tbody>${txnRows || '<tr><td colspan="4">No transactions</td></tr>'}</tbody></table>
</body></html>`;
}
