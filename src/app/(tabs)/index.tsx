import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { usePeriod, usePeriodTransactions } from '@/store/selectors';
import { useMoney } from '@/hooks/useMoney';
import { accountBalance, expenseByCategory, filterTransactions, netWorth, sortByDateDesc, totals } from '@/domain/analytics';
import { allBudgetProgress, budgetSummary } from '@/domain/budgets';
import { cycleConfigFromSettings, cycleDayInfo, recentCycles } from '@/domain/cycle';
import { AppBar, Button, Card, CardTitle, IconButton, ProgressBar, Row, Screen, EmptyState } from '@/components/ui/Primitives';
import { Icon, TileIcon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { Hero, HeroMini, KpiTile } from '@/components/Hero';
import { PeriodChip } from '@/components/Pickers';
import { BarChart, Doughnut, Legend } from '@/components/charts/Charts';
import { TxnRow } from '@/components/TxnRow';

export default function Dashboard() {
  const { colors, series } = useTheme();
  const money = useMoney();
  const accounts = useStore((s) => s.accounts);
  const allTxns = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const budgets = useStore((s) => s.budgets);
  const settings = useStore((s) => s.settings);
  const period = usePeriod();
  const txns = usePeriodTransactions(null);

  const t = useMemo(() => totals(txns), [txns]);
  const nw = useMemo(() => netWorth(accounts, allTxns), [accounts, allTxns]);
  const byCat = useMemo(() => expenseByCategory(txns), [txns]);
  const progress = useMemo(() => allBudgetProgress(budgets, txns, settings.budgetAlerts.thresholds[0] ?? 80), [budgets, txns, settings.budgetAlerts.thresholds]);
  const bSum = useMemo(() => budgetSummary(progress), [progress]);
  const day = cycleDayInfo(period.cycle, new Date());
  const recent = useMemo(() => sortByDateDesc(txns).slice(0, 5), [txns]);
  const cfg = cycleConfigFromSettings(settings);
  const history = useMemo(() => recentCycles(new Date(), 4, cfg).map((c) => ({ c, t: totals(filterTransactions(allTxns, { range: c })) })), [allTxns, cfg.mode, cfg.startDay]); // eslint-disable-line react-hooks/exhaustive-deps
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const topSlices = byCat.slice(0, 5);
  const otherAmt = byCat.slice(5).reduce((s, x) => s + x.amount, 0);
  const slices = [...topSlices.map((s, i) => ({ value: s.amount, color: series[i], label: categories.find((c) => c.id === s.categoryId)?.name ?? 'Other' })), ...(otherAmt > 0 ? [{ value: otherAmt, color: colors.ink4, label: 'Other' }] : [])];

  return (
    <Screen>
      <AppBar
        title="Dashboard"
        subtitle={greeting}
        large
        right={
          <>
            <PeriodChip />
            <IconButton name="cog-outline" onPress={() => router.push('/settings')} testID="open-settings" />
          </>
        }
      />

      <Hero>
        <Txt v="caption" color="rgba(255,255,255,0.78)">Total balance · all accounts</Txt>
        <Txt v="display" color="#fff" tabular style={{ marginTop: 4 }} testID="total-balance">{money(nw.total)}</Txt>
        <Row gap={10} style={{ marginTop: 16 }}>
          <HeroMini label={period.isCurrent ? 'Savings this cycle' : 'Net for period'} value={money(t.net, { sign: true })} />
          <HeroMini label={period.isCurrent ? `Day ${day.dayIndex} of ${day.totalDays}` : period.label} value={period.isCurrent ? `${day.daysLeft} days left` : `${day.totalDays} days`} icon={<Icon name="calendar-clock" size={14} color="#fff" />} />
        </Row>
      </Hero>

      <Row gap={10} style={{ marginBottom: 14 }}>
        <KpiTile label="Income" value={money(t.income, { compact: true })} tone="income" icon="arrow-down-left" />
        <KpiTile label="Expenses" value={money(t.expense, { compact: true })} tone="expense" icon="arrow-up-right" />
        <KpiTile label="Budget used" value={bSum.allocated > 0 ? `${bSum.pct}%` : '—'} tone="primary" icon="chart-donut" />
      </Row>

      {accounts.length === 0 ? (
        <Card>
          <EmptyState icon="wallet-plus-outline" title="Add an account" body="Create your first account to start tracking." action={<Button label="Add account" onPress={() => router.push('/accounts/edit')} />} />
        </Card>
      ) : null}

      <Card>
        <CardTitle title="Budget utilisation" right={<Pressable onPress={() => router.push('/(tabs)/budgets')}><Txt v="small" color={colors.primaryInk} style={{ fontWeight: '700' }}>View all</Txt></Pressable>} />
        {bSum.allocated > 0 ? (
          <>
            <ProgressBar value={bSum.pct} tone={bSum.pct >= 100 ? 'over' : bSum.pct >= 80 ? 'warn' : 'primary'} height={10} />
            <Row between style={{ marginTop: 8 }}>
              <Txt v="muted" tabular>{money(bSum.spent)} of {money(bSum.allocated)}</Txt>
              <Txt v="muted" tabular>{money(Math.max(0, bSum.remaining))} left</Txt>
            </Row>
          </>
        ) : (
          <Txt v="muted">No budgets yet. Set category budgets to see how you are tracking.</Txt>
        )}
      </Card>

      <Card>
        <CardTitle title="Spending by category" right={<Pressable onPress={() => router.push('/(tabs)/reports')}><Txt v="small" color={colors.primaryInk} style={{ fontWeight: '700' }}>Details</Txt></Pressable>} />
        {byCat.length === 0 ? (
          <Txt v="muted">No expenses in this period yet.</Txt>
        ) : (
          <Row gap={16} center={false}>
            <Doughnut slices={slices} size={124} centerTop="Spent" centerBottom={money(t.expense, { compact: true })} />
            <View style={{ flex: 1 }}>
              {slices.map((s, i) => (
                <Row key={i} between style={{ paddingVertical: 4 }}>
                  <Row gap={8} style={{ flex: 1 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: s.color }} />
                    <Txt v="small" numberOfLines={1} style={{ flex: 1 }}>{s.label}</Txt>
                  </Row>
                  <Txt v="small" tabular style={{ fontWeight: '700' }}>{Math.round((s.value / Math.max(1, t.expense)) * 100)}%</Txt>
                </Row>
              ))}
            </View>
          </Row>
        )}
      </Card>

      <Card>
        <CardTitle title="Income vs expenses" sub="last 4 cycles" />
        <BarChart groups={history.map((h) => ({ label: h.c.short, values: [h.t.income, h.t.expense] }))} colors={[colors.income, colors.expense]} height={150} indian={settings.currency === 'INR'} />
        <Legend items={[{ label: 'Income', color: colors.income }, { label: 'Expense', color: colors.expense }]} />
      </Card>

      {accounts.length > 0 ? (
        <>
          <Row between style={{ marginBottom: 10 }}>
            <Txt v="h3">Accounts</Txt>
            <Pressable onPress={() => router.push('/accounts')}><Txt v="small" color={colors.primaryInk} style={{ fontWeight: '700' }}>Manage</Txt></Pressable>
          </Row>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 14 }}>
            {accounts.filter((a) => !a.archived).map((a) => {
              const bal = accountBalance(a, allTxns);
              return (
                <Pressable key={a.id} onPress={() => router.push(`/accounts/${a.id}`)} style={{ width: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 12 }}>
                  <TileIcon name={a.icon} color={a.color} size={34} />
                  <Txt v="small" numberOfLines={1} style={{ marginTop: 10, fontWeight: '700' }}>{a.name}</Txt>
                  <Txt v="h3" tabular color={bal < 0 ? colors.expenseInk : colors.ink} numberOfLines={1}>{money(bal)}</Txt>
                </Pressable>
              );
            })}
            <Pressable onPress={() => router.push('/accounts/edit')} style={{ width: 110, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border2, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="plus" size={22} color={colors.ink3} />
              <Txt v="caption">Add account</Txt>
            </Pressable>
          </ScrollView>
        </>
      ) : null}

      <Card>
        <CardTitle title="Recent transactions" right={<Pressable onPress={() => router.push('/(tabs)/transactions')}><Txt v="small" color={colors.primaryInk} style={{ fontWeight: '700' }}>See all</Txt></Pressable>} />
        {recent.length === 0 ? <Txt v="muted">Nothing recorded in this period. Tap + to add a transaction.</Txt> : recent.map((x, i) => <TxnRow key={x.id} txn={x} last={i === recent.length - 1} onPress={() => router.push(`/transaction/${x.id}`)} />)}
      </Card>
    </Screen>
  );
}
