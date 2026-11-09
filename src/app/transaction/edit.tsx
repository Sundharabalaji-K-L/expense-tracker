import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { useCategoriesByKind, useActiveAccounts } from '@/store/selectors';
import { useMoney } from '@/hooks/useMoney';
import { useToast } from '@/components/ui/Toast';
import { accountBalance } from '@/domain/analytics';
import { fromLocalISO, toLocalISO } from '@/domain/dates';
import { parseAmount } from '@/domain/money';
import type { TxnType } from '@/domain/types';
import { computeBudgetAlerts, dispatchBudgetAlerts } from '@/services/budgetAlerts';
import { AppBar, Button, Chip, IconButton, Note, Row, Screen, Segmented } from '@/components/ui/Primitives';
import { Keypad } from '@/components/ui/Keypad';
import { TextField } from '@/components/ui/TextField';
import { Icon, TileIcon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { AccountSheet, CategorySheet, DateTimeSheet } from '@/components/Pickers';

export default function TransactionEdit() {
  const params = useLocalSearchParams<{ id?: string; type?: string; accountId?: string }>();
  const { colors } = useTheme();
  const money = useMoney();
  const toast = useToast();
  const existing = useStore((s) => s.transactions.find((t) => t.id === params.id));
  const accounts = useActiveAccounts();
  const allTxns = useStore((s) => s.transactions);
  const allCategories = useStore((s) => s.categories);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const logAlert = useStore((s) => s.logAlert);

  const [type, setType] = useState<TxnType>(existing?.type ?? ((params.type as TxnType) || 'expense'));
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '0');
  const [accountId, setAccountId] = useState(existing?.accountId ?? params.accountId ?? accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(existing?.toAccountId ?? accounts.find((a) => a.id !== (params.accountId ?? accounts[0]?.id))?.id ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [subcategoryId, setSubcategoryId] = useState(existing?.subcategoryId ?? '');
  const [date, setDate] = useState(existing ? fromLocalISO(existing.date) : new Date());
  const [note, setNote] = useState(existing?.note ?? '');
  const [keypad, setKeypad] = useState(!existing);
  const [accOpen, setAccOpen] = useState<'from' | 'to' | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const kind = type === 'income' ? 'income' : 'expense';
  const categories = useCategoriesByKind(kind);
  const category = categories.find((c) => c.id === categoryId);
  const account = accounts.find((a) => a.id === accountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const balances = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, money(accountBalance(a, allTxns))])), [accounts, allTxns, money]);
  const quick = categories.slice(0, 7);

  const changeType = (v: TxnType) => {
    setType(v);
    // Expense and income categories are different sets: clear a category that no longer applies.
    const nextKind = v === 'income' ? 'income' : 'expense';
    if (categoryId && !allCategories.some((c) => c.id === categoryId && c.kind === nextKind)) { setCategoryId(''); setSubcategoryId(''); }
  };

  const toneColor = type === 'expense' ? colors.expenseInk : type === 'income' ? colors.incomeInk : colors.transferInk;
  const amountNum = parseAmount(amount);

  const save = async () => {
    try {
      const before = { transactions: useStore.getState().transactions };
      const input = { type, amount: amountNum, accountId, toAccountId: type === 'transfer' ? toAccountId : undefined, categoryId: type === 'transfer' ? undefined : categoryId, subcategoryId: type === 'transfer' ? undefined : subcategoryId || undefined, date: toLocalISO(date), note };
      if (existing) updateTransaction(existing.id, input);
      else addTransaction(input);
      const after = useStore.getState();
      const alerts = type === 'expense' ? computeBudgetAlerts(before, after, categoryId, input.date) : [];
      toast(existing ? 'Transaction updated' : type === 'transfer' ? 'Transfer recorded' : `${type === 'expense' ? 'Expense' : 'Income'} added`, { tone: 'ok' });
      router.back();
      void dispatchBudgetAlerts(alerts, logAlert, (m) => toast(m, { tone: 'warn' }));
    } catch (e) {
      toast((e as Error).message, { tone: 'danger' });
    }
  };

  const typeTones = { expense: colors.expenseInk, income: colors.incomeInk, transfer: colors.transferInk };

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <AppBar title={existing ? 'Edit transaction' : 'Add transaction'} right={<IconButton name="close" onPress={() => router.back()} testID="close-edit" />} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {!existing ? (
          <Segmented
            options={[{ value: 'expense', label: 'Expense', icon: 'arrow-up-right' }, { value: 'income', label: 'Income', icon: 'arrow-down-left' }, { value: 'transfer', label: 'Transfer', icon: 'swap-horizontal' }]}
            value={type}
            onChange={changeType}
            tones={typeTones}
          />
        ) : null}

        <Pressable onPress={() => setKeypad(true)} style={{ alignItems: 'center', paddingVertical: 8 }} testID="amount-display">
          <Txt v="caption">Amount</Txt>
          <Txt v="display" color={toneColor} tabular style={{ fontSize: 42, lineHeight: 48, marginTop: 2 }}>{money(amountNum, { decimals: amount.includes('.') ? 'always' : 'never' })}</Txt>
        </Pressable>

        {type !== 'transfer' ? (
          <>
            <Txt v="label" style={{ marginTop: 8, marginBottom: 8 }}>Category</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {quick.map((c) => {
                const on = c.id === categoryId;
                return (
                  <Pressable key={c.id} testID={`cat-${c.id}`} onPress={() => { setCategoryId(c.id); setSubcategoryId(''); }} style={{ width: '23.5%', alignItems: 'center', paddingVertical: 6, borderRadius: 14, backgroundColor: on ? colors.primarySoft : 'transparent' }}>
                    <TileIcon name={c.icon} color={c.color} size={42} soft={!on} />
                    <Txt v="caption" numberOfLines={1} color={on ? colors.primaryInk : colors.ink2} style={{ marginTop: 5, fontWeight: on ? '700' : '500' }}>{c.name.split(' ')[0]}</Txt>
                  </Pressable>
                );
              })}
              <Pressable testID="cat-more" onPress={() => setCatOpen(true)} style={{ width: '23.5%', alignItems: 'center', paddingVertical: 6 }}>
                <View style={{ width: 42, height: 42, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border2, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="dots-horizontal" size={20} color={colors.ink3} />
                </View>
                <Txt v="caption" style={{ marginTop: 5 }}>{category && !quick.some((q) => q.id === category.id) ? category.name.split(' ')[0] : 'More'}</Txt>
              </Pressable>
            </View>
            {category?.subcategories.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 6 }}>
                {category.subcategories.map((s) => <Chip key={s.id} label={s.name} active={s.id === subcategoryId} onPress={() => setSubcategoryId(s.id === subcategoryId ? '' : s.id)} />)}
              </ScrollView>
            ) : null}
          </>
        ) : (
          <View style={{ backgroundColor: colors.surface2, borderRadius: 16, padding: 14, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable style={{ flex: 1 }} onPress={() => setAccOpen('from')} testID="from-account">
              <Txt v="caption">From</Txt>
              <Row gap={6} style={{ marginTop: 4 }}>{account ? <TileIcon name={account.icon} color={account.color} size={22} /> : null}<Txt v="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{account?.name ?? 'Choose'}</Txt></Row>
              {account ? <Txt v="caption" tabular>{balances[account.id]} available</Txt> : null}
            </Pressable>
            <Pressable onPress={() => { const a = accountId; setAccountId(toAccountId); setToAccountId(a); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.transferSoft, alignItems: 'center', justifyContent: 'center' }} testID="swap-accounts">
              <Icon name="swap-horizontal" size={18} color={colors.transferInk} />
            </Pressable>
            <Pressable style={{ flex: 1, alignItems: 'flex-end' }} onPress={() => setAccOpen('to')} testID="to-account">
              <Txt v="caption">To</Txt>
              <Row gap={6} style={{ marginTop: 4 }}><Txt v="bodyStrong" numberOfLines={1}>{toAccount?.name ?? 'Choose'}</Txt>{toAccount ? <TileIcon name={toAccount.icon} color={toAccount.color} size={22} /> : null}</Row>
              {toAccount ? <Txt v="caption" tabular>{balances[toAccount.id]} now</Txt> : null}
            </Pressable>
          </View>
        )}

        {type === 'transfer' ? <Note tone="info" icon="swap-horizontal">Transfers move money between your own accounts and are never counted as income or expense.</Note> : null}

        <View style={{ marginTop: 10 }}>
          {type !== 'transfer' ? (
            <FieldRow icon={account?.icon ?? 'wallet-outline'} color={account?.color} label="Account" value={account?.name ?? 'Choose account'} onPress={() => setAccOpen('from')} testID="account-field" />
          ) : null}
          <FieldRow icon="calendar-clock" label="Date & time" value={format(date, 'EEE, d MMM yyyy · h:mm a')} onPress={() => setDateOpen(true)} testID="date-field" />
          <TextField label="Note (optional)" placeholder={type === 'transfer' ? 'e.g. ATM withdrawal' : 'e.g. Lunch with team'} value={note} onChangeText={setNote} icon="note-text-outline" onFocus={() => setKeypad(false)} testID="note-input" />
        </View>

        {keypad ? (
          <View style={{ marginTop: 6 }}>
            <Keypad value={amount} onChange={setAmount} onDone={() => setKeypad(false)} />
          </View>
        ) : null}
        <View style={{ height: 14 }} />
        <Button label={existing ? 'Save changes' : type === 'transfer' ? 'Record transfer' : `Save ${type}`} icon="check" onPress={save} disabled={amountNum <= 0 || !accountId || (type !== 'transfer' && !categoryId) || (type === 'transfer' && !toAccountId)} testID="save-transaction" />
      </ScrollView>

      <AccountSheet visible={accOpen !== null} onClose={() => setAccOpen(null)} title={accOpen === 'to' ? 'Transfer to' : type === 'transfer' ? 'Transfer from' : 'Account'} exclude={accOpen === 'to' ? accountId : accOpen === 'from' && type === 'transfer' ? toAccountId : undefined} balances={balances} onSelect={(a) => (accOpen === 'to' ? setToAccountId(a.id) : setAccountId(a.id))} />
      <CategorySheet visible={catOpen} onClose={() => setCatOpen(false)} kind={kind} selectedId={categoryId} onSelect={(c, s) => { setCategoryId(c.id); setSubcategoryId(s ?? ''); }} />
      <DateTimeSheet visible={dateOpen} onClose={() => setDateOpen(false)} value={date} onChange={setDate} />
    </Screen>
  );
}

function FieldRow({ icon, color, label, value, onPress, testID }: { icon: string; color?: string; label: string; value: string; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 }, pressed && { opacity: 0.7 }]}>
      <TileIcon name={icon} color={color ?? colors.ink3} size={36} soft />
      <View style={{ flex: 1 }}>
        <Txt v="caption">{label}</Txt>
        <Txt v="bodyStrong" numberOfLines={1}>{value}</Txt>
      </View>
      <Icon name="chevron-right" size={20} color={colors.ink4} />
    </Pressable>
  );
}
