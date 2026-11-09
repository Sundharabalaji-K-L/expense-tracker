import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore, useUiStore } from '@/store/useStore';
import { usePeriod } from '@/store/selectors';
import { useMoney } from '@/hooks/useMoney';
import { filterTransactions, groupByDay, totals } from '@/domain/analytics';
import { relativeDayLabel } from '@/domain/dates';
import type { Transaction } from '@/domain/types';
import { AppBar, Card, Chip, EmptyState, IconButton, ListItem, Radio, Row, Screen, Button } from '@/components/ui/Primitives';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { TileIcon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { KpiTile } from '@/components/Hero';
import { AccountSheet, PeriodChip } from '@/components/Pickers';
import { TxnRow } from '@/components/TxnRow';

type TypeFilter = 'all' | Transaction['type'];

export default function Transactions() {
  const { colors } = useTheme();
  const money = useMoney();
  const all = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const noSpendDays = useStore((s) => s.reminder.noSpendDays);
  const period = usePeriod();
  const { accountFilter, setAccountFilter } = useUiStore();
  const [type, setType] = useState<TypeFilter>('all');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [accOpen, setAccOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const txns = useMemo(() => filterTransactions(all, { range: period.range, accountId: accountFilter, categoryId, type, search }, categories), [all, period.range, accountFilter, categoryId, type, search, categories]);
  const groups = useMemo(() => groupByDay(txns), [txns]);
  const t = useMemo(() => totals(txns, accountFilter), [txns, accountFilter]);
  const account = accounts.find((a) => a.id === accountFilter);
  const category = categories.find((c) => c.id === categoryId);
  const noSpendInPeriod = noSpendDays.filter((k) => { const d = new Date(k); return d >= period.range.start && d < period.range.end; }).length;

  return (
    <Screen>
      <AppBar title="Transactions" subtitle={`${period.label} · ${txns.length} entries`} large right={<><IconButton name={showSearch ? 'close' : 'magnify'} onPress={() => { setShowSearch(!showSearch); setSearch(''); }} testID="toggle-search" /><PeriodChip /></>} />
      {showSearch ? <TextField placeholder="Search notes, categories, amounts" icon="magnify" value={search} onChangeText={setSearch} autoFocus testID="search-input" /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
        <Chip label={account ? account.name : 'All accounts'} icon="wallet-outline" active={!!account} trailingIcon="chevron-down" onPress={() => setAccOpen(true)} />
        <Chip label={type === 'all' ? 'All types' : type[0].toUpperCase() + type.slice(1)} active={type !== 'all'} trailingIcon="chevron-down" onPress={() => setTypeOpen(true)} />
        <Chip label={category ? category.name : 'Category'} active={!!category} trailingIcon="chevron-down" onPress={() => setCatOpen(true)} />
        {(account || type !== 'all' || category) ? <Chip label="Clear" icon="close" onPress={() => { setAccountFilter(null); setType('all'); setCategoryId(null); }} /> : null}
      </ScrollView>

      <Row gap={10} style={{ marginBottom: 6 }}>
        <KpiTile label="In" value={money(t.income, { compact: true })} tone="income" />
        <KpiTile label="Out" value={money(t.expense, { compact: true })} tone="expense" />
        <KpiTile label="Net" value={money(t.net, { compact: true })} />
      </Row>
      {noSpendInPeriod > 0 ? <Txt v="caption" style={{ marginBottom: 6 }}>{noSpendInPeriod} day{noSpendInPeriod > 1 ? 's' : ''} confirmed as no spending in this period.</Txt> : null}

      {groups.length === 0 ? (
        <EmptyState icon="receipt-text-outline" title="No transactions" body={search || category || type !== 'all' || account ? 'Nothing matches these filters.' : 'Nothing recorded in this period yet.'} action={<Button label="Add transaction" icon="plus" onPress={() => router.push('/transaction/edit')} />} />
      ) : (
        groups.map((g) => (
          <View key={g.key} style={{ marginTop: 10 }}>
            <Row between style={{ marginBottom: 6, paddingHorizontal: 2 }}>
              <Txt v="label">{relativeDayLabel(g.date)}</Txt>
              <Row gap={10}>
                {g.income > 0 ? <Txt v="caption" color={colors.incomeInk} tabular style={{ fontWeight: '700' }}>+{money(g.income)}</Txt> : null}
                {g.expense > 0 ? <Txt v="caption" color={colors.expenseInk} tabular style={{ fontWeight: '700' }}>−{money(g.expense)}</Txt> : null}
              </Row>
            </Row>
            <Card style={{ paddingVertical: 4 }}>
              {g.items.map((x, i) => <TxnRow key={x.id} txn={x} last={i === g.items.length - 1} onPress={() => router.push(`/transaction/${x.id}`)} />)}
            </Card>
          </View>
        ))
      )}

      <AccountSheet visible={accOpen} onClose={() => setAccOpen(false)} title="Filter by account" onSelect={(a) => setAccountFilter(a.id)} />
      <Sheet visible={typeOpen} onClose={() => setTypeOpen(false)} title="Transaction type">
        {(['all', 'expense', 'income', 'transfer'] as TypeFilter[]).map((v, i) => (
          <ListItem key={v} left={<Radio on={type === v} />} title={v === 'all' ? 'All types' : v[0].toUpperCase() + v.slice(1)} onPress={() => { setType(v); setTypeOpen(false); }} last={i === 3} />
        ))}
      </Sheet>
      <Sheet visible={catOpen} onClose={() => setCatOpen(false)} title="Filter by category">
        <ListItem left={<Radio on={!categoryId} />} title="All categories" onPress={() => { setCategoryId(null); setCatOpen(false); }} />
        {categories.filter((c) => !c.archived).map((c, i, arr) => (
          <ListItem key={c.id} left={<TileIcon name={c.icon} color={c.color} size={34} />} title={c.name} subtitle={c.kind} onPress={() => { setCategoryId(c.id); setCatOpen(false); }} last={i === arr.length - 1} />
        ))}
      </Sheet>
    </Screen>
  );
}
