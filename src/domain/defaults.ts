import type { Account, Category, Subcategory } from './types';

const subs = (names: string[], prefix: string): Subcategory[] =>
  names.map((name, i) => ({ id: `${prefix}_${i + 1}`, name }));

/** Default categories shipped with the app. Ids are stable so budgets/seeds can reference them. */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Food & Dining', kind: 'expense', icon: 'silverware-fork-knife', color: '#eb6834', isDefault: true, sortOrder: 1, subcategories: subs(['Restaurants', 'Cafe', 'Delivery', 'Snacks'], 'cat_food') },
  { id: 'cat_transport', name: 'Transportation', kind: 'expense', icon: 'car', color: '#eda100', isDefault: true, sortOrder: 2, subcategories: subs(['Fuel', 'Cab', 'Metro', 'Bus', 'Parking'], 'cat_transport') },
  { id: 'cat_shopping', name: 'Shopping', kind: 'expense', icon: 'shopping', color: '#e87ba4', isDefault: true, sortOrder: 3, subcategories: subs(['Clothing', 'Electronics', 'Online'], 'cat_shopping') },
  { id: 'cat_groceries', name: 'Groceries', kind: 'expense', icon: 'cart', color: '#1baf7a', isDefault: true, sortOrder: 4, subcategories: subs(['Supermarket', 'Vegetables', 'Dairy'], 'cat_groceries') },
  { id: 'cat_bills', name: 'Bills & Utilities', kind: 'expense', icon: 'flash', color: '#6250d6', isDefault: true, sortOrder: 5, subcategories: subs(['Electricity', 'Water', 'Internet', 'Mobile', 'Gas'], 'cat_bills') },
  { id: 'cat_entertainment', name: 'Entertainment', kind: 'expense', icon: 'movie-open', color: '#e34948', isDefault: true, sortOrder: 6, subcategories: subs(['Movies', 'OTT', 'Games', 'Events'], 'cat_entertainment') },
  { id: 'cat_health', name: 'Healthcare', kind: 'expense', icon: 'heart-pulse', color: '#008300', isDefault: true, sortOrder: 7, subcategories: subs(['Doctor', 'Medicine', 'Insurance'], 'cat_health') },
  { id: 'cat_education', name: 'Education', kind: 'expense', icon: 'school', color: '#2a78d6', isDefault: true, sortOrder: 8, subcategories: subs(['Courses', 'Books', 'Fees'], 'cat_education') },
  { id: 'cat_rent', name: 'Rent', kind: 'expense', icon: 'home-city', color: '#0e7490', isDefault: true, sortOrder: 9, subcategories: subs(['House rent', 'Maintenance'], 'cat_rent') },
  { id: 'cat_travel', name: 'Travel', kind: 'expense', icon: 'airplane', color: '#0891b2', isDefault: true, sortOrder: 10, subcategories: subs(['Flights', 'Hotels', 'Trips'], 'cat_travel') },
  { id: 'cat_personal', name: 'Personal Care', kind: 'expense', icon: 'content-cut', color: '#c026d3', isDefault: true, sortOrder: 11, subcategories: subs(['Salon', 'Gym', 'Cosmetics'], 'cat_personal') },
  { id: 'cat_others', name: 'Others', kind: 'expense', icon: 'package-variant', color: '#6b7280', isDefault: true, sortOrder: 12, subcategories: [] },

  { id: 'inc_salary', name: 'Salary', kind: 'income', icon: 'briefcase', color: '#0f9d58', isDefault: true, sortOrder: 1, subcategories: subs(['Monthly salary', 'Bonus'], 'inc_salary') },
  { id: 'inc_freelance', name: 'Freelancing', kind: 'income', icon: 'laptop', color: '#2a78d6', isDefault: true, sortOrder: 2, subcategories: [] },
  { id: 'inc_business', name: 'Business Income', kind: 'income', icon: 'store', color: '#6250d6', isDefault: true, sortOrder: 3, subcategories: [] },
  { id: 'inc_investments', name: 'Investments', kind: 'income', icon: 'trending-up', color: '#eda100', isDefault: true, sortOrder: 4, subcategories: subs(['Dividends', 'Capital gains'], 'inc_investments') },
  { id: 'inc_interest', name: 'Interest', kind: 'income', icon: 'percent', color: '#1baf7a', isDefault: true, sortOrder: 5, subcategories: [] },
  { id: 'inc_other', name: 'Other Income', kind: 'income', icon: 'gift', color: '#6b7280', isDefault: true, sortOrder: 6, subcategories: subs(['Gift', 'Refund', 'Cashback'], 'inc_other') },
];

export const CATEGORY_COLORS = [
  '#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948',
  '#0e7490', '#0891b2', '#c026d3', '#6b7280', '#f97316', '#84cc16', '#14b8a6', '#a855f7',
];

export const CATEGORY_ICONS = [
  'silverware-fork-knife', 'car', 'shopping', 'cart', 'flash', 'movie-open', 'heart-pulse', 'school',
  'home-city', 'airplane', 'content-cut', 'package-variant', 'briefcase', 'laptop', 'store', 'trending-up',
  'percent', 'gift', 'paw', 'baby-carriage', 'dumbbell', 'coffee', 'bus', 'gas-station', 'phone',
  'wifi', 'tshirt-crew', 'pill', 'book-open-variant', 'gamepad-variant', 'music', 'tools', 'hand-coin',
  'charity', 'cash', 'bank', 'credit-card', 'wallet', 'piggy-bank', 'star',
];

export const ACCOUNT_PRESETS: { type: Account['type']; label: string; icon: string; color: string }[] = [
  { type: 'bank', label: 'Bank account', icon: 'bank', color: '#2563eb' },
  { type: 'cash', label: 'Cash', icon: 'cash', color: '#0f9d58' },
  { type: 'upi', label: 'UPI / Wallet', icon: 'cellphone', color: '#6f5bd6' },
  { type: 'credit', label: 'Credit card', icon: 'credit-card', color: '#e03e3e' },
  { type: 'custom', label: 'Other', icon: 'wallet', color: '#f59e0b' },
];
