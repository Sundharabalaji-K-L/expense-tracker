import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { formatMoney } from '@/domain/money';
import { formatTime, fromLocalISO } from '@/domain/dates';
import type { Transaction } from '@/domain/types';
import { TileIcon } from './ui/Icon';
import { Txt } from './ui/Txt';

export function useTxnPresentation(t: Transaction) {
  const { colors } = useTheme();
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const currency = useStore((s) => s.settings.currency);
  const account = accounts.find((a) => a.id === t.accountId);
  const toAccount = accounts.find((a) => a.id === t.toAccountId);
  const category = categories.find((c) => c.id === t.categoryId);
  const sub = category?.subcategories.find((s) => s.id === t.subcategoryId);

  if (t.type === 'transfer') {
    return {
      icon: 'swap-horizontal',
      color: colors.transfer,
      title: t.note || `${account?.name ?? '?'} → ${toAccount?.name ?? '?'}`,
      subtitle: t.note ? `${account?.name ?? '?'} → ${toAccount?.name ?? '?'}` : 'Transfer',
      amountText: formatMoney(t.amount, { currency }),
      amountColor: colors.transferInk,
      account,
      toAccount,
      category,
    };
  }
  const isExp = t.type === 'expense';
  return {
    icon: category?.icon ?? 'help',
    color: category?.color ?? colors.ink3,
    title: t.note || category?.name || 'Uncategorised',
    subtitle: [t.note ? category?.name : null, sub?.name, account?.name].filter(Boolean).join(' · '),
    amountText: `${isExp ? '−' : '+'}${formatMoney(t.amount, { currency })}`,
    amountColor: isExp ? colors.expenseInk : colors.incomeInk,
    account,
    toAccount,
    category,
  };
}

export function TxnRow({ txn, onPress, showTime = true, last }: { txn: Transaction; onPress?: () => void; showTime?: boolean; last?: boolean }) {
  const { colors } = useTheme();
  const p = useTxnPresentation(txn);
  return (
    <Pressable testID={`txn-${txn.id}`} onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]}>
      <TileIcon name={p.icon} color={p.color} size={40} soft />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="bodyStrong" numberOfLines={1}>{p.title}</Txt>
        <Txt v="muted" numberOfLines={1} style={{ marginTop: 1 }}>{p.subtitle}</Txt>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt v="bodyStrong" color={p.amountColor} tabular style={{ fontWeight: '700' }}>{p.amountText}</Txt>
        {showTime ? <Txt v="caption" style={{ marginTop: 1 }}>{formatTime(fromLocalISO(txn.date))}</Txt> : null}
      </View>
    </Pressable>
  );
}
