import { useStore } from '@/store/useStore';
import { accountBalance, totals } from '@/domain/analytics';
import { buildSampleData } from '@/domain/sample';
import { transactionsToCSV, reportToHTML } from '@/domain/exporters';

beforeEach(() => {
  useStore.getState().resetAll();
});

describe('store', () => {
  test('accounts, transactions and transfers keep balances consistent', () => {
    const s = useStore.getState();
    const bank = s.addAccount({ name: 'Bank', type: 'bank', openingBalance: 1000, color: '#000', icon: 'bank' });
    const cash = s.addAccount({ name: 'Cash', type: 'cash', openingBalance: 0, color: '#000', icon: 'cash' });
    s.addTransaction({ type: 'income', amount: 500, accountId: bank.id, categoryId: 'inc_salary', date: '2026-11-01T09:00:00' });
    s.addTransaction({ type: 'expense', amount: 120.456, accountId: bank.id, categoryId: 'cat_food', date: '2026-11-02T09:00:00', note: '  Lunch  ' });
    s.addTransaction({ type: 'transfer', amount: 200, accountId: bank.id, toAccountId: cash.id, date: '2026-11-03T09:00:00' });
    const { transactions } = useStore.getState();
    expect(transactions).toHaveLength(3);
    expect(transactions[1].amount).toBe(120.46);
    expect(transactions[1].note).toBe('Lunch');
    expect(accountBalance(bank, transactions)).toBe(1000 + 500 - 120.46 - 200);
    expect(accountBalance(cash, transactions)).toBe(200);
    const t = totals(transactions);
    expect(t.income).toBe(500);
    expect(t.expense).toBe(120.46);
  });

  test('validation rejects bad transactions', () => {
    const s = useStore.getState();
    const bank = s.addAccount({ name: 'Bank', type: 'bank', openingBalance: 0, color: '#000', icon: 'bank' });
    expect(() => s.addTransaction({ type: 'expense', amount: 0, accountId: bank.id, categoryId: 'cat_food', date: '2026-11-01T09:00:00' })).toThrow(/greater than zero/);
    expect(() => s.addTransaction({ type: 'expense', amount: 10, accountId: bank.id, date: '2026-11-01T09:00:00' })).toThrow(/Category/);
    expect(() => s.addTransaction({ type: 'transfer', amount: 10, accountId: bank.id, toAccountId: bank.id, date: '2026-11-01T09:00:00' })).toThrow(/different accounts/);
    expect(() => s.addTransaction({ type: 'transfer', amount: 10, accountId: bank.id, date: '2026-11-01T09:00:00' })).toThrow(/Destination/);
  });

  test('update and delete transactions', () => {
    const s = useStore.getState();
    const bank = s.addAccount({ name: 'Bank', type: 'bank', openingBalance: 0, color: '#000', icon: 'bank' });
    const t = s.addTransaction({ type: 'expense', amount: 10, accountId: bank.id, categoryId: 'cat_food', date: '2026-11-01T09:00:00' });
    s.updateTransaction(t.id, { amount: 25, categoryId: 'cat_transport' });
    expect(useStore.getState().transactions[0]).toMatchObject({ amount: 25, categoryId: 'cat_transport' });
    s.deleteTransaction(t.id);
    expect(useStore.getState().transactions).toHaveLength(0);
  });

  test('deleting an account removes its transactions', () => {
    const s = useStore.getState();
    const bank = s.addAccount({ name: 'Bank', type: 'bank', openingBalance: 0, color: '#000', icon: 'bank' });
    const cash = s.addAccount({ name: 'Cash', type: 'cash', openingBalance: 0, color: '#000', icon: 'cash' });
    s.addTransaction({ type: 'expense', amount: 10, accountId: bank.id, categoryId: 'cat_food', date: '2026-11-01T09:00:00' });
    s.addTransaction({ type: 'transfer', amount: 10, accountId: cash.id, toAccountId: bank.id, date: '2026-11-01T09:00:00' });
    s.addTransaction({ type: 'expense', amount: 5, accountId: cash.id, categoryId: 'cat_food', date: '2026-11-01T09:00:00' });
    s.deleteAccount(bank.id);
    expect(useStore.getState().accounts.map((a) => a.id)).toEqual([cash.id]);
    expect(useStore.getState().transactions).toHaveLength(1);
  });

  test('custom categories can be created, edited and deleted with reassignment', () => {
    const s = useStore.getState();
    const bank = s.addAccount({ name: 'Bank', type: 'bank', openingBalance: 0, color: '#000', icon: 'bank' });
    const pet = s.addCategory({ name: 'Pet care', kind: 'expense', icon: 'paw', color: '#111', subcategories: [{ id: 'x', name: 'Vet' }] });
    expect(pet.isDefault).toBe(false);
    s.setBudget(pet.id, 1500);
    s.addTransaction({ type: 'expense', amount: 10, accountId: bank.id, categoryId: pet.id, subcategoryId: 'x', date: '2026-11-01T09:00:00' });
    s.updateCategory(pet.id, { name: 'Pets' });
    expect(useStore.getState().categories.find((c) => c.id === pet.id)?.name).toBe('Pets');
    s.deleteCategory(pet.id);
    const after = useStore.getState();
    expect(after.categories.some((c) => c.id === pet.id)).toBe(false);
    expect(after.transactions[0]).toMatchObject({ categoryId: 'cat_others', subcategoryId: undefined });
    expect(after.budgets).toHaveLength(0);
    // the fallback category itself cannot be deleted
    s.deleteCategory('cat_others');
    expect(useStore.getState().categories.some((c) => c.id === 'cat_others')).toBe(true);
  });

  test('budgets upsert by category', () => {
    const s = useStore.getState();
    s.setBudget('cat_food', 1000);
    s.setBudget('cat_food', 1200);
    s.setBudget('cat_rent', 20000);
    expect(useStore.getState().budgets).toHaveLength(2);
    expect(useStore.getState().budgets[0].amount).toBe(1200);
    s.removeBudget('cat_food');
    expect(useStore.getState().budgets.map((b) => b.categoryId)).toEqual(['cat_rent']);
  });

  test('settings, reminder state and alert log update', () => {
    const s = useStore.getState();
    s.updateSettings({ cycleMode: 'calendar', theme: 'dark' });
    s.setReminderState((r) => ({ ...r, noSpendDays: ['2026-11-09'] }));
    s.logAlert('k');
    const st = useStore.getState();
    expect(st.settings.cycleMode).toBe('calendar');
    expect(st.settings.theme).toBe('dark');
    expect(st.reminder.noSpendDays).toEqual(['2026-11-09']);
    expect(st.alertLog.k).toBe(true);
  });
});

describe('sample data and exports', () => {
  test('sample data is deterministic and internally consistent', () => {
    const a = buildSampleData(new Date(2026, 10, 9, 15));
    const b = buildSampleData(new Date(2026, 10, 9, 15));
    expect(a.transactions.length).toBe(b.transactions.length);
    expect(a.transactions.length).toBeGreaterThan(100);
    const accountIds = new Set(a.accounts.map((x) => x.id));
    for (const t of a.transactions) {
      expect(accountIds.has(t.accountId)).toBe(true);
      if (t.type === 'transfer') expect(accountIds.has(t.toAccountId!)).toBe(true);
      else expect(t.categoryId).toBeTruthy();
      expect(t.amount).toBeGreaterThan(0);
    }
    expect(a.transactions.filter((t) => t.type === 'income' && t.categoryId === 'inc_salary').length).toBeGreaterThanOrEqual(3);
  });

  test('CSV export escapes fields and includes every transaction', () => {
    const s = useStore.getState();
    const bank = s.addAccount({ name: 'Bank, Main', type: 'bank', openingBalance: 0, color: '#000', icon: 'bank' });
    const cash = s.addAccount({ name: 'Cash', type: 'cash', openingBalance: 0, color: '#000', icon: 'cash' });
    s.addTransaction({ type: 'expense', amount: 12.5, accountId: bank.id, categoryId: 'cat_food', subcategoryId: 'cat_food_1', date: '2026-11-02T13:05:00', note: 'Said "hi", left' });
    s.addTransaction({ type: 'transfer', amount: 100, accountId: bank.id, toAccountId: cash.id, date: '2026-11-03T09:00:00' });
    const st = useStore.getState();
    const csv = transactionsToCSV(st.transactions, { accounts: st.accounts, categories: st.categories, currency: 'INR', rangeLabel: 'Nov' });
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Date,Time,Type,Amount,Category,Subcategory,Account,To Account,Note');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('2026-11-03,09:00,transfer,100.00,,,"Bank, Main",Cash,');
    expect(lines[2]).toBe('2026-11-02,13:05,expense,12.50,Food & Dining,Restaurants,"Bank, Main",,"Said ""hi"", left"');
  });

  test('HTML report contains totals, categories and escapes markup', () => {
    const s = useStore.getState();
    const bank = s.addAccount({ name: 'Bank', type: 'bank', openingBalance: 0, color: '#000', icon: 'bank' });
    s.addTransaction({ type: 'income', amount: 5000, accountId: bank.id, categoryId: 'inc_salary', date: '2026-11-01T09:00:00' });
    s.addTransaction({ type: 'expense', amount: 300, accountId: bank.id, categoryId: 'cat_food', date: '2026-11-02T13:05:00', note: '<script>x</script>' });
    const st = useStore.getState();
    const html = reportToHTML(st.transactions, [], { accounts: st.accounts, categories: st.categories, currency: 'INR', rangeLabel: 'Nov <2026>' });
    expect(html).toContain('₹5,000.00');
    expect(html).toContain('₹300.00');
    expect(html).toContain('Food &amp; Dining');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).not.toContain('<script>x');
    expect(html).toContain('Nov &lt;2026&gt;');
  });
});
