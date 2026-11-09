import { toLocalISO } from './dates';
import { newId } from './ids';
import type { Account, Budget, Transaction } from './types';

/** Deterministic pseudo-random generator so sample data is stable between runs. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export interface SampleData {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
}

/** Three months of realistic demo data ending today. */
export function buildSampleData(now = new Date()): SampleData {
  const rand = rng(42);
  const created = now.toISOString();
  const accounts: Account[] = [
    { id: 'acc_hdfc', name: 'HDFC Bank', type: 'bank', openingBalance: 42000, color: '#2563eb', icon: 'bank', createdAt: created, note: 'Salary account' },
    { id: 'acc_cash', name: 'Cash', type: 'cash', openingBalance: 2500, color: '#0f9d58', icon: 'cash', createdAt: created },
    { id: 'acc_upi', name: 'PhonePe UPI', type: 'upi', openingBalance: 4000, color: '#6f5bd6', icon: 'cellphone', createdAt: created },
    { id: 'acc_card', name: 'ICICI Credit Card', type: 'credit', openingBalance: 0, color: '#e03e3e', icon: 'credit-card', creditLimit: 100000, createdAt: created },
  ];
  const budgets: Budget[] = [
    { id: 'bud_1', categoryId: 'cat_food', amount: 7000 },
    { id: 'bud_2', categoryId: 'cat_groceries', amount: 6500 },
    { id: 'bud_3', categoryId: 'cat_transport', amount: 8000 },
    { id: 'bud_4', categoryId: 'cat_shopping', amount: 8000 },
    { id: 'bud_5', categoryId: 'cat_bills', amount: 6000 },
    { id: 'bud_6', categoryId: 'cat_entertainment', amount: 2000 },
    { id: 'bud_7', categoryId: 'cat_rent', amount: 20000 },
  ];

  const txns: Transaction[] = [];
  const push = (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => txns.push({ ...t, id: newId('txn_'), createdAt: created, updatedAt: created });
  const at = (d: Date, h: number, m = 0) => toLocalISO(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m));

  const daily: { cat: string; sub?: string; acc: string; min: number; max: number; p: number; notes: string[] }[] = [
    { cat: 'cat_food', sub: 'cat_food_3', acc: 'acc_upi', min: 120, max: 520, p: 0.55, notes: ['Swiggy', 'Zomato', 'Lunch', 'Dinner with friends', 'Breakfast'] },
    { cat: 'cat_food', sub: 'cat_food_2', acc: 'acc_cash', min: 40, max: 180, p: 0.4, notes: ['Tea', 'Coffee', 'Snacks'] },
    { cat: 'cat_transport', sub: 'cat_transport_2', acc: 'acc_upi', min: 90, max: 420, p: 0.35, notes: ['Uber', 'Ola', 'Rapido'] },
    { cat: 'cat_transport', sub: 'cat_transport_3', acc: 'acc_cash', min: 30, max: 80, p: 0.3, notes: ['Metro'] },
    { cat: 'cat_groceries', sub: 'cat_groceries_1', acc: 'acc_card', min: 400, max: 2200, p: 0.18, notes: ['BigBasket', 'DMart', 'Blinkit'] },
    { cat: 'cat_shopping', sub: 'cat_shopping_3', acc: 'acc_card', min: 500, max: 3500, p: 0.08, notes: ['Amazon', 'Myntra', 'Flipkart'] },
    { cat: 'cat_entertainment', sub: 'cat_entertainment_1', acc: 'acc_upi', min: 250, max: 900, p: 0.07, notes: ['PVR', 'Bookmyshow'] },
    { cat: 'cat_health', sub: 'cat_health_2', acc: 'acc_cash', min: 150, max: 1200, p: 0.05, notes: ['Apollo Pharmacy'] },
    { cat: 'cat_personal', sub: 'cat_personal_1', acc: 'acc_cash', min: 150, max: 600, p: 0.05, notes: ['Salon', 'Haircut'] },
  ];

  const startDay = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  for (let d = new Date(startDay); d <= now; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const isLast = d.getDate() === new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if (isLast) {
      push({ type: 'income', amount: 58000, accountId: 'acc_hdfc', categoryId: 'inc_salary', subcategoryId: 'inc_salary_1', date: at(d, 9, 5), note: 'Monthly salary' });
    }
    if (d.getDate() === 2) push({ type: 'expense', amount: 20000, accountId: 'acc_hdfc', categoryId: 'cat_rent', subcategoryId: 'cat_rent_1', date: at(d, 10), note: 'House rent' });
    if (d.getDate() === 7) push({ type: 'expense', amount: 1800 + Math.round(rand() * 900), accountId: 'acc_hdfc', categoryId: 'cat_bills', subcategoryId: 'cat_bills_1', date: at(d, 18, 30), note: 'Electricity bill' });
    if (d.getDate() === 12) push({ type: 'expense', amount: 999, accountId: 'acc_hdfc', categoryId: 'cat_bills', subcategoryId: 'cat_bills_3', date: at(d, 12), note: 'Broadband' });
    if (d.getDate() === 15) push({ type: 'expense', amount: 449, accountId: 'acc_upi', categoryId: 'cat_bills', subcategoryId: 'cat_bills_4', date: at(d, 8, 15), note: 'Mobile recharge' });
    if (d.getDate() === 18) push({ type: 'transfer', amount: 9000 + Math.round(rand() * 4000), accountId: 'acc_hdfc', toAccountId: 'acc_card', date: at(d, 20), note: 'Credit card bill' });
    if (d.getDate() === 5 || d.getDate() === 20) push({ type: 'transfer', amount: 3000, accountId: 'acc_hdfc', toAccountId: 'acc_upi', date: at(d, 9, 30), note: 'Top up' });
    if (d.getDate() === 10) push({ type: 'transfer', amount: 2000, accountId: 'acc_hdfc', toAccountId: 'acc_cash', date: at(d, 11), note: 'ATM withdrawal' });
    if (d.getDate() === 25 && rand() < 0.6) push({ type: 'income', amount: 4000 + Math.round(rand() * 6000), accountId: 'acc_hdfc', categoryId: 'inc_freelance', date: at(d, 16), note: 'Freelance project' });
    if (d.getDate() === 28 && rand() < 0.5) push({ type: 'income', amount: Math.round(300 + rand() * 500), accountId: 'acc_hdfc', categoryId: 'inc_interest', date: at(d, 0, 5), note: 'Savings interest' });

    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const isToday = d.toDateString() === now.toDateString();
    for (const rule of daily) {
      const p = rule.p * (weekend ? 1.25 : 1);
      if (rand() < p) {
        const hour = 8 + Math.floor(rand() * 13);
        if (isToday && hour > now.getHours()) continue;
        push({ type: 'expense', amount: Math.round(rule.min + rand() * (rule.max - rule.min)), accountId: rule.acc, categoryId: rule.cat, subcategoryId: rule.sub, date: at(d, hour, Math.floor(rand() * 60)), note: rule.notes[Math.floor(rand() * rule.notes.length)] });
      }
    }
  }
  return { accounts, transactions: txns, budgets };
}
