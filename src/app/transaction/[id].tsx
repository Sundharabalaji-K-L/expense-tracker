import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/ui/Toast';
import { formatDateLong, formatTime, fromLocalISO } from '@/domain/dates';
import { AppBar, Button, Card, EmptyState, ListItem, Pill, Row, Screen } from '@/components/ui/Primitives';
import { ConfirmDialog } from '@/components/ui/Sheet';
import { Icon, TileIcon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { useTxnPresentation } from '@/components/TxnRow';

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const txn = useStore((s) => s.transactions.find((t) => t.id === id));
  if (!txn) {
    return (
      <Screen>
        <AppBar title="Transaction" back />
        <EmptyState icon="alert-circle-outline" title="Not found" body="This transaction no longer exists." />
      </Screen>
    );
  }
  return <Detail id={id} />;
}

function Detail({ id }: { id: string }) {
  const { colors } = useTheme();
  const toast = useToast();
  const txn = useStore((s) => s.transactions.find((t) => t.id === id))!;
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const p = useTxnPresentation(txn);
  const [confirm, setConfirm] = useState(false);
  const d = fromLocalISO(txn.date);
  const sub = p.category?.subcategories.find((s) => s.id === txn.subcategoryId);
  const tone = txn.type === 'expense' ? 'over' : txn.type === 'income' ? 'ok' : 'trf';

  return (
    <Screen>
      <AppBar title="Transaction" back />
      <View style={{ alignItems: 'center', marginVertical: 10 }}>
        <TileIcon name={p.icon} color={p.color} size={72} />
        <Txt v="display" color={p.amountColor} tabular style={{ marginTop: 14 }}>{p.amountText}</Txt>
        <Txt v="h3" style={{ marginTop: 6 }}>{p.title}</Txt>
        <View style={{ marginTop: 8 }}><Pill tone={tone} label={txn.type[0].toUpperCase() + txn.type.slice(1)} /></View>
      </View>
      <Card style={{ paddingVertical: 4 }}>
        {txn.type !== 'transfer' ? (
          <ListItem left={<Icon name="shape-outline" />} title={p.category?.name ?? 'Uncategorised'} subtitle={sub ? `Subcategory · ${sub.name}` : 'Category'} />
        ) : null}
        <ListItem left={<Icon name="wallet-outline" />} title={p.account?.name ?? '—'} subtitle={txn.type === 'transfer' ? 'From account' : 'Account'} />
        {txn.type === 'transfer' ? <ListItem left={<Icon name="arrow-right" />} title={p.toAccount?.name ?? '—'} subtitle="To account" /> : null}
        <ListItem left={<Icon name="calendar-clock" />} title={formatDateLong(d)} subtitle={formatTime(d)} />
        <ListItem left={<Icon name="note-text-outline" />} title={txn.note || 'No note'} subtitle="Note" last />
      </Card>
      <Row gap={10}>
        <Button label="Delete" icon="trash-can-outline" variant="dangerGhost" onPress={() => setConfirm(true)} style={{ flex: 1 }} testID="delete-transaction" />
        <Button label="Edit" icon="pencil-outline" onPress={() => router.push(`/transaction/edit?id=${txn.id}`)} style={{ flex: 2 }} testID="edit-transaction" />
      </Row>
      <ConfirmDialog visible={confirm} onClose={() => setConfirm(false)} title="Delete transaction?" body="This cannot be undone. Balances and budgets will update immediately." onConfirm={() => { deleteTransaction(txn.id); setConfirm(false); toast('Transaction deleted', { tone: 'ok' }); router.back(); }} />
      <Txt v="caption" center style={{ marginTop: 16, color: colors.ink4 }}>Added {new Date(txn.createdAt).toLocaleString()}</Txt>
    </Screen>
  );
}
