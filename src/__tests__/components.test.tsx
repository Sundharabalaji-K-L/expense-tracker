import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { useStore } from '@/store/useStore';
import { TxnRow } from '@/components/TxnRow';
import { Keypad } from '@/components/ui/Keypad';
import { BarChart, Doughnut, LineChart, Ring } from '@/components/charts/Charts';
import { Button, ProgressBar, Segmented } from '@/components/ui/Primitives';
import { BudgetRow } from '@/app/(tabs)/budgets';
import { budgetProgress } from '@/domain/budgets';
import { dayKey } from '@/domain/dates';
import Reminder from '@/app/reminder';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

const wrap = (ui: React.ReactElement) => (
  <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>
  </SafeAreaProvider>
);

beforeEach(() => {
  useStore.getState().resetAll();
});

describe('components', () => {
  test('TxnRow renders expense with category, account and signed amount', async () => {
    const s = useStore.getState();
    const bank = s.addAccount({ name: 'HDFC Bank', type: 'bank', openingBalance: 0, color: '#000', icon: 'bank' });
    const t = s.addTransaction({ type: 'expense', amount: 420, accountId: bank.id, categoryId: 'cat_food', subcategoryId: 'cat_food_1', date: '2026-11-09T13:10:00', note: 'Lunch · Swiggy' });
    await render(wrap(<TxnRow txn={t} />));
    expect(screen.getByText('Lunch · Swiggy')).toBeTruthy();
    expect(screen.getByText('Food & Dining · Restaurants · HDFC Bank')).toBeTruthy();
    expect(screen.getByText('−₹420')).toBeTruthy();
    expect(screen.getByText('1:10 PM')).toBeTruthy();
  });

  test('TxnRow renders transfers with both accounts', async () => {
    const s = useStore.getState();
    const bank = s.addAccount({ name: 'Bank', type: 'bank', openingBalance: 0, color: '#000', icon: 'bank' });
    const cash = s.addAccount({ name: 'Cash', type: 'cash', openingBalance: 0, color: '#000', icon: 'cash' });
    const t = s.addTransaction({ type: 'transfer', amount: 2000, accountId: bank.id, toAccountId: cash.id, date: '2026-11-09T09:30:00' });
    await render(wrap(<TxnRow txn={t} />));
    expect(screen.getByText('Bank → Cash')).toBeTruthy();
    expect(screen.getByText('₹2,000')).toBeTruthy();
  });

  test('Keypad presses update the value and Done fires', async () => {
    const onChange = jest.fn();
    const onDone = jest.fn();
    await render(wrap(<Keypad value="4" onChange={onChange} onDone={onDone} />));
    await fireEvent.press(screen.getByTestId('key-2'));
    expect(onChange).toHaveBeenCalledWith('42');
    await fireEvent.press(screen.getByTestId('key-back'));
    expect(onChange).toHaveBeenCalledWith('0');
    await fireEvent.press(screen.getByTestId('keypad-done'));
    expect(onDone).toHaveBeenCalled();
  });

  test('BudgetRow shows status pill and amounts', async () => {
    const s = useStore.getState();
    const bank = s.addAccount({ name: 'Bank', type: 'bank', openingBalance: 0, color: '#000', icon: 'bank' });
    s.addTransaction({ type: 'expense', amount: 7480, accountId: bank.id, categoryId: 'cat_food', date: '2026-11-09T13:10:00' });
    const p = budgetProgress({ id: 'b', categoryId: 'cat_food', amount: 7000 }, useStore.getState().transactions);
    await render(wrap(<BudgetRow p={p} />));
    expect(screen.getByText('Food & Dining')).toBeTruthy();
    expect(screen.getByText('Over by ₹480')).toBeTruthy();
    expect(screen.getByText('Spent ₹7,480')).toBeTruthy();
  });

  test('charts render without data and with data', async () => {
    const result = await render(
      wrap(
        <>
          <Doughnut slices={[]} />
          <Doughnut slices={[{ value: 10, color: '#f00' }, { value: 30, color: '#0f0' }]} centerTop="Spent" centerBottom="₹40" />
          <Ring value={62} color="#00f" />
          <BarChart groups={[{ label: 'Oct', values: [10, 5] }]} colors={['#0f0', '#f00']} width={300} />
          <LineChart points={[{ label: '1', value: 0 }, { label: '2', value: 5 }]} color="#00f" />
          <ProgressBar value={140} />
        </>,
      ),
    );
    expect(result.toJSON()).toBeTruthy();
    expect(screen.getByText('62%')).toBeTruthy();
    expect(screen.getByText('₹40')).toBeTruthy();
  });

  test('Segmented and Button handle presses', async () => {
    const onChange = jest.fn();
    const onPress = jest.fn();
    await render(wrap(<><Segmented options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} value="a" onChange={onChange} /><Button label="Go" onPress={onPress} testID="go" /><Button label="Off" onPress={onPress} disabled testID="off" /></>));
    await fireEvent.press(screen.getByText('B'));
    expect(onChange).toHaveBeenCalledWith('b');
    await fireEvent.press(screen.getByTestId('go'));
    expect(onPress).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('off'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('Reminder modal: "No spending today" records the day', async () => {
    await render(wrap(<Reminder />));
    expect(screen.getByText('Did you spend anything today?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('reminder-nospend'));
    expect(useStore.getState().reminder.noSpendDays).toEqual([dayKey(new Date())]);
  });

  test('Reminder modal: "Remind me later" shows same-day slots', async () => {
    await render(wrap(<Reminder />));
    await fireEvent.press(screen.getByTestId('reminder-later'));
    expect(screen.getByText('Remind me later')).toBeTruthy();
    expect(screen.getByText('In 30 min')).toBeTruthy();
  });
});
