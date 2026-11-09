import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { usePeriod, usePeriodTransactions, useAccount } from '@/store/selectors';
import { useMoney } from '@/hooks/useMoney';
import { useToast } from '@/components/ui/Toast';
import { accountBalance, dailySeries, groupByDay, totals } from '@/domain/analytics';
import { relativeDayLabel } from '@/domain/dates';
import { AppBar, Button, Card, CardTitle, EmptyState, IconButton, ListItem, Row, Screen } from '@/components/ui/Primitives';
import { ConfirmDialog, Sheet } from '@/components/ui/Sheet';
import { Icon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { Hero, HeroMini, KpiTile } from '@/components/Hero';
import { PeriodChip, accountTypeLabel } from '@/components/Pickers';
import { LineChart } from '@/components/charts/Charts';
import { TxnRow } from '@/components/TxnRow';

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, series } = useTheme();
  const money = useMoney();
  const toast = useToast();
  const account = useAccount(id);
  const all = useStore((s) => s.transactions);
  const deleteAccount = useStore((s) => s.deleteAccount);
  const currency = useStore((s) => s.settings.currency);
  const period = usePeriod();
  const txns = usePeriodTransactions(id);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const bal = useMemo(() => (account ? accountBalance(account, all) : 0), [account, all]);
  const t = useMemo(() => totals(txns, id), [txns, id]);
  const daily = useMemo(() => dailySeries(txns.filter((x) => x.accountId === id), period.range), [txns, period.range, id]);
  const groups = useMemo(() => groupByDay(txns), [txns]);
  const count = all.filter((x) => x.accountId === id || x.toAccountId === id).length;

  if (!account) {
    return (
      <Screen>
        <AppBar title="Account" back />
        <EmptyState icon="alert-circle-outline" title="Account not found" body="It may have been deleted." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar title={account.name} subtitle={accountTypeLabel(account.type)} back large right={<><PeriodChip /><IconButton name="dots-horizontal" onPress={() => setMenu(true)} testID="account-menu" /></>} />
      <Hero color={account.color}>
        <Txt v="caption" color="rgba(255,255,255,0.78)">{account.type === 'credit' ? (bal < 0 ? 'Outstanding dues' : 'Credit balance') : 'Current balance'}</Txt>
        <Txt v="display" color="#fff" tabular style={{ marginTop: 4 }}>{money(account.type === 'credit' ? Math.abs(bal) : bal)}</Txt>
        <Row gap={10} style={{ marginTop: 16 }}>
          <HeroMini label={period.isCurrent ? 'In this cycle' : 'In'} value={money(t.income + t.transfersIn, { compact: true })} icon={<Icon name="arrow-down-left" size={14} color="#fff" />} />
          <HeroMini label={period.isCurrent ? 'Out this cycle' : 'Out'} value={money(t.expense + t.transfersOut, { compact: true })} icon={<Icon name="arrow-up-right" size={14} color="#fff" />} />
        </Row>
        {account.type === 'credit' && account.creditLimit ? <Txt v="caption" color="rgba(255,255,255,0.8)" style={{ marginTop: 10 }}>Limit {money(account.creditLimit)} · {Math.round((Math.max(0, -bal) / account.creditLimit) * 100)}% used</Txt> : null}
      </Hero>
      <Row gap={10} style={{ marginBottom: 14 }}>
        <KpiTile label="Income" value={money(t.income, { compact: true })} tone="income" />
        <KpiTile label="Expenses" value={money(t.expense, { compact: true })} tone="expense" />
        <KpiTile label="Transfers" value={money(t.transfersIn - t.transfersOut, { compact: true, sign: true })} />
      </Row>
      <Card>
        <CardTitle title="Spending trend" sub="daily" />
        <LineChart points={daily.map((d) => ({ label: format(d.date, 'd MMM'), value: d.expense }))} color={series[0]} labels={[format(period.range.start, 'd MMM'), '', format(new Date(period.range.end.getTime() - 1), 'd MMM')]} indian={currency === 'INR'} />
      </Card>
      <CardTitle title="Transactions" right={<Txt v="muted">{txns.length} in period</Txt>} />
      {groups.length === 0 ? <EmptyState icon="receipt-text-outline" title="No activity" body="No transactions for this account in the selected period." /> : groups.map((g) => (
        <View key={g.key}>
          <Txt v="label" style={{ marginBottom: 6, marginTop: 4 }}>{relativeDayLabel(g.date)}</Txt>
          <Card style={{ paddingVertical: 4 }}>
            {g.items.map((x, i) => <TxnRow key={x.id} txn={x} last={i === g.items.length - 1} onPress={() => router.push(`/transaction/${x.id}`)} />)}
          </Card>
        </View>
      ))}

      <Sheet visible={menu} onClose={() => setMenu(false)} title={account.name}>
        <ListItem left={<Icon name="pencil-outline" />} title="Edit account" onPress={() => { setMenu(false); router.push(`/accounts/edit?id=${account.id}`); }} />
        <ListItem left={<Icon name="swap-horizontal" />} title="Transfer from this account" onPress={() => { setMenu(false); router.push(`/transaction/edit?type=transfer&accountId=${account.id}`); }} />
        <ListItem left={<Icon name="plus" />} title="Add expense to this account" onPress={() => { setMenu(false); router.push(`/transaction/edit?type=expense&accountId=${account.id}`); }} />
        <ListItem left={<Icon name="trash-can-outline" color={colors.expense} />} title="Delete account" subtitle={count > 0 ? `Also deletes ${count} transaction${count === 1 ? '' : 's'}` : undefined} onPress={() => { setMenu(false); setConfirm(true); }} last />
      </Sheet>
      <ConfirmDialog visible={confirm} onClose={() => setConfirm(false)} title="Delete account?" body={count > 0 ? `${account.name} and its ${count} transaction${count === 1 ? '' : 's'} will be removed permanently.` : `${account.name} will be removed.`} onConfirm={() => { deleteAccount(account.id); setConfirm(false); toast('Account deleted', { tone: 'ok' }); router.back(); }} />
      <View style={{ height: 10 }} />
      <Button label="Add transaction" icon="plus" variant="secondary" onPress={() => router.push(`/transaction/edit?accountId=${account.id}`)} />
    </Screen>
  );
}
