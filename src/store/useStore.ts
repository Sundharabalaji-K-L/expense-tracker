import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_CATEGORIES } from '@/domain/defaults';
import { newId } from '@/domain/ids';
import { round2 } from '@/domain/money';
import { toLocalISO } from '@/domain/dates';
import {
  DEFAULT_REMINDER_STATE,
  DEFAULT_SETTINGS,
  type Account,
  type Budget,
  type Category,
  type ReminderState,
  type Settings,
  type SyncedSettings,
  type Transaction,
} from '@/domain/types';

export interface TransactionInput {
  type: Transaction['type'];
  amount: number;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  subcategoryId?: string;
  date: string;
  note?: string;
}

export interface RemotePatch {
  accounts?: Account[];
  categories?: Category[];
  transactions?: Transaction[];
  budgets?: Budget[];
  settings?: SyncedSettings;
  settingsUpdatedAt?: string;
}

export interface AppState {
  hydrated: boolean;
  /** Firebase uid that owns the local data; local data is wiped when a different user signs in. */
  ownerUid: string | null;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  settings: Settings;
  settingsUpdatedAt: string;
  reminder: ReminderState;
  alertLog: Record<string, true>;

  setHydrated: (v: boolean) => void;
  setOwner: (uid: string | null) => void;

  addAccount: (a: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Account;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  /** Deletes the account and all transactions that touch it. */
  deleteAccount: (id: string) => void;

  addCategory: (c: Omit<Category, 'id' | 'isDefault' | 'sortOrder' | 'updatedAt'>) => Category;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  /** Deletes the category, moving its transactions to `moveToId` (defaults to Others / Other Income). */
  deleteCategory: (id: string, moveToId?: string) => void;

  addTransaction: (t: TransactionInput) => Transaction;
  updateTransaction: (id: string, patch: Partial<TransactionInput>) => void;
  deleteTransaction: (id: string) => void;

  setBudget: (categoryId: string, amount: number) => void;
  removeBudget: (categoryId: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  setReminderState: (updater: (s: ReminderState) => ReminderState) => void;
  logAlert: (key: string) => void;

  /** Applies data received from the cloud without touching version stamps. */
  applyRemote: (patch: RemotePatch) => void;
  replaceAll: (data: Partial<Pick<AppState, 'accounts' | 'categories' | 'transactions' | 'budgets' | 'settings'>>) => void;
  resetAll: () => void;
}

function validateTxn(t: TransactionInput): void {
  if (!(t.amount > 0)) throw new Error('Amount must be greater than zero');
  if (!t.accountId) throw new Error('Account is required');
  if (t.type === 'transfer') {
    if (!t.toAccountId) throw new Error('Destination account is required');
    if (t.toAccountId === t.accountId) throw new Error('Choose two different accounts');
  } else if (!t.categoryId) {
    throw new Error('Category is required');
  }
}

const nowISO = () => new Date().toISOString();
const stamp = <T extends object>(items: T[]): T[] => items.map((x) => ({ ...x, updatedAt: nowISO() }));

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ownerUid: null,
      accounts: [],
      categories: stamp(DEFAULT_CATEGORIES),
      transactions: [],
      budgets: [],
      settings: DEFAULT_SETTINGS,
      settingsUpdatedAt: nowISO(),
      reminder: DEFAULT_REMINDER_STATE,
      alertLog: {},

      setHydrated: (v) => set({ hydrated: v }),
      setOwner: (uid) => set({ ownerUid: uid }),

      addAccount: (a) => {
        const now = nowISO();
        const account: Account = { ...a, id: newId('acc_'), createdAt: now, updatedAt: now, openingBalance: round2(a.openingBalance || 0) };
        set((s) => ({ accounts: [...s.accounts, account] }));
        return account;
      },
      updateAccount: (id, patch) => set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch, id, updatedAt: nowISO() } : a)) })),
      deleteAccount: (id) =>
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          transactions: s.transactions.filter((t) => t.accountId !== id && t.toAccountId !== id),
        })),

      addCategory: (c) => {
        const kindCats = get().categories.filter((x) => x.kind === c.kind);
        const category: Category = { ...c, id: newId('cat_'), isDefault: false, sortOrder: kindCats.length + 1, subcategories: c.subcategories ?? [], updatedAt: nowISO() };
        set((s) => ({ categories: [...s.categories, category] }));
        return category;
      },
      updateCategory: (id, patch) => set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch, id, updatedAt: nowISO() } : c)) })),
      deleteCategory: (id, moveToId) =>
        set((s) => {
          const victim = s.categories.find((c) => c.id === id);
          if (!victim) return {};
          const fallback = moveToId ?? (victim.kind === 'expense' ? 'cat_others' : 'inc_other');
          if (fallback === id) return {};
          const now = nowISO();
          return {
            categories: s.categories.filter((c) => c.id !== id),
            transactions: s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: fallback, subcategoryId: undefined, updatedAt: now } : t)),
            budgets: s.budgets.filter((b) => b.categoryId !== id),
          };
        }),

      addTransaction: (input) => {
        validateTxn(input);
        const now = nowISO();
        const t: Transaction = {
          id: newId('txn_'),
          type: input.type,
          amount: round2(input.amount),
          accountId: input.accountId,
          toAccountId: input.type === 'transfer' ? input.toAccountId : undefined,
          categoryId: input.type === 'transfer' ? undefined : input.categoryId,
          subcategoryId: input.type === 'transfer' ? undefined : input.subcategoryId,
          date: input.date || toLocalISO(new Date()),
          note: input.note?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ transactions: [...s.transactions, t] }));
        return t;
      },
      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) => {
            if (t.id !== id) return t;
            const merged: TransactionInput = { ...t, ...patch };
            validateTxn(merged);
            return {
              ...t,
              ...merged,
              amount: round2(merged.amount),
              toAccountId: merged.type === 'transfer' ? merged.toAccountId : undefined,
              categoryId: merged.type === 'transfer' ? undefined : merged.categoryId,
              subcategoryId: merged.type === 'transfer' ? undefined : merged.subcategoryId,
              note: merged.note?.trim() || undefined,
              updatedAt: nowISO(),
            };
          }),
        })),
      deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      setBudget: (categoryId, amount) =>
        set((s) => {
          const existing = s.budgets.find((b) => b.categoryId === categoryId);
          const amt = round2(amount);
          const now = nowISO();
          if (existing) return { budgets: s.budgets.map((b) => (b.categoryId === categoryId ? { ...b, amount: amt, updatedAt: now } : b)) };
          return { budgets: [...s.budgets, { id: newId('bud_'), categoryId, amount: amt, updatedAt: now }] };
        }),
      removeBudget: (categoryId) => set((s) => ({ budgets: s.budgets.filter((b) => b.categoryId !== categoryId) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch }, settingsUpdatedAt: nowISO() })),
      setReminderState: (updater) => set((s) => ({ reminder: updater(s.reminder) })),
      logAlert: (key) => set((s) => ({ alertLog: { ...s.alertLog, [key]: true } })),

      applyRemote: (patch) =>
        set((s) => {
          const next: Partial<AppState> = {};
          if (patch.accounts) next.accounts = patch.accounts;
          if (patch.categories) next.categories = patch.categories;
          if (patch.transactions) next.transactions = patch.transactions;
          if (patch.budgets) next.budgets = patch.budgets;
          if (patch.settings) {
            next.settings = { ...patch.settings, theme: s.settings.theme };
            next.settingsUpdatedAt = patch.settingsUpdatedAt ?? nowISO();
          }
          return next;
        }),
      replaceAll: (data) =>
        set(() => ({
          ...(data.accounts ? { accounts: stamp(data.accounts) } : {}),
          ...(data.categories ? { categories: stamp(data.categories) } : {}),
          ...(data.transactions ? { transactions: stamp(data.transactions) } : {}),
          ...(data.budgets ? { budgets: stamp(data.budgets) } : {}),
          ...(data.settings ? { settings: data.settings, settingsUpdatedAt: nowISO() } : {}),
        })),
      resetAll: () =>
        set({
          accounts: [],
          categories: stamp(DEFAULT_CATEGORIES),
          transactions: [],
          budgets: [],
          settings: { ...DEFAULT_SETTINGS, onboarded: false },
          settingsUpdatedAt: nowISO(),
          reminder: DEFAULT_REMINDER_STATE,
          alertLog: {},
        }),
    }),
    {
      name: 'expense-tracker-v1',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        ownerUid: s.ownerUid,
        accounts: s.accounts,
        categories: s.categories,
        transactions: s.transactions,
        budgets: s.budgets,
        settings: s.settings,
        settingsUpdatedAt: s.settingsUpdatedAt,
        reminder: s.reminder,
        alertLog: s.alertLog,
      }),
      migrate: (persisted, fromVersion) => {
        const p = persisted as Partial<AppState>;
        if (fromVersion < 2) {
          return { ...p, ownerUid: null, settingsUpdatedAt: p.settingsUpdatedAt ?? nowISO() } as AppState;
        }
        return p as AppState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

/** Non-persisted UI state shared between dashboard, budgets and reports. */
export interface UiState {
  cycleOffset: number;
  customRange: { start: string; end: string } | null;
  accountFilter: string | null;
  setCycleOffset: (n: number) => void;
  setCustomRange: (r: { start: string; end: string } | null) => void;
  setAccountFilter: (id: string | null) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  cycleOffset: 0,
  customRange: null,
  accountFilter: null,
  setCycleOffset: (n) => set({ cycleOffset: n, customRange: null }),
  setCustomRange: (r) => set({ customRange: r }),
  setAccountFilter: (id) => set({ accountFilter: id }),
}));
