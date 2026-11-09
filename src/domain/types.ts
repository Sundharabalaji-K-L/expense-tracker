export type AccountType = 'bank' | 'cash' | 'upi' | 'credit' | 'custom';
export type TxnType = 'expense' | 'income' | 'transfer';
export type CategoryKind = 'expense' | 'income';
export type ThemeMode = 'system' | 'light' | 'dark';
export type CycleMode = 'salary' | 'calendar';
/** 1..31 or 'last' (last day of the month). */
export type CycleStartDay = number | 'last';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;
  icon: string;
  creditLimit?: number;
  note?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Subcategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  subcategories: Subcategory[];
  isDefault: boolean;
  archived?: boolean;
  sortOrder: number;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  type: TxnType;
  amount: number;
  accountId: string;
  /** Only for transfers. */
  toAccountId?: string;
  /** Not set for transfers. */
  categoryId?: string;
  subcategoryId?: string;
  /** Local ISO datetime, e.g. 2026-11-09T13:10:00 */
  date: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  updatedAt?: string;
}

/** The part of Settings that is shared across a user's devices. Theme stays per device. */
export type SyncedSettings = Omit<Settings, 'theme'>;

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  /** Hour (0-23) after which "remind me later" slots are not offered. */
  quietFromHour: number;
}

export interface BudgetAlertSettings {
  enabled: boolean;
  thresholds: number[];
}

export interface Settings {
  onboarded: boolean;
  currency: string;
  theme: ThemeMode;
  cycleMode: CycleMode;
  cycleStartDay: CycleStartDay;
  reminder: ReminderSettings;
  budgetAlerts: BudgetAlertSettings;
}

export interface ReminderState {
  /** yyyy-MM-dd days the user confirmed as "no spending". */
  noSpendDays: string[];
  /** ISO datetime the user asked to be reminded at (same day only). */
  snoozeUntil: string | null;
  /** yyyy-MM-dd of the last day an in-app prompt was shown. */
  lastPromptDate: string | null;
}

export interface DateRange {
  /** inclusive */
  start: Date;
  /** exclusive */
  end: Date;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  currency: 'INR',
  theme: 'system',
  cycleMode: 'salary',
  cycleStartDay: 'last',
  reminder: { enabled: true, hour: 20, minute: 30, quietFromHour: 23 },
  budgetAlerts: { enabled: true, thresholds: [80, 100] },
};

export const DEFAULT_REMINDER_STATE: ReminderState = {
  noSpendDays: [],
  snoozeUntil: null,
  lastPromptDate: null,
};
