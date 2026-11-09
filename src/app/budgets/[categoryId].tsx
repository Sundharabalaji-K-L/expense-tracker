import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { useCategory, usePeriod, usePeriodTransactions } from '@/store/selectors';
import { useMoney } from '@/hooks/useMoney';
import { filterTransactions, sortByDateDesc, spentInCategory } from '@/domain/analytics';
import { budgetProgress, dailyAllowance } from '@/domain/budgets';
import { cycleConfigFromSettings, cycleDayInfo, recentCycles } from '@/domain/cycle';
import { AppBar, Button, Card, CardTitle, EmptyState, IconButton, Pill, ProgressBar, Row, Screen } from '@/components/ui/Primitives';
import { TileIcon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { KpiTile } from '@/components/Hero';
import { PeriodChip } from '@/components/Pickers';
import { BarChart, Legend, Ring } from '@/components/charts/Charts';
import { TxnRow } from '@/components/TxnRow';

export default function BudgetDetail() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const { colors } = useTheme();
  const money = useMoney();
  const category = useCategory(categoryId);
  const budget = useStore((s) => s.budgets.find((b) => b.categoryId === categoryId));
  const all = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const period = usePeriod();
  const txns = usePeriodTransactions(null);
  const catTxns = useMemo(() => sortByDateDesc(txns.filter((t) => t.categoryId === categoryId && t.type === 'expense')), [txns, categoryId]);
  const spent = useMemo(() => spentInCategory(txns, categoryId), [txns, categoryId]);
  const p = budget ? budgetProgress(budget, txns, settings.budgetAlerts.thresholds[0] ?? 80) : null;
  const day = cycleDayInfo(period.cycle, new Date());
  const cfg = cycleConfigFromSettings(settings);
  const history = useMemo(() => recentCycles(period.cycle.start, 6, cfg).map((c) => ({ c, v: spentInCategory(filterTransactions(all, { range: c }), categoryId) })), [all, period.cycle.start, cfg, categoryId]);
  const tone = p?.status === 'over' ? colors.expense : p?.status === 'warn' ? colors.warn : colors.primary;

  if (!category) {
    return <Screen><AppBar title="Budget" back /><EmptyState icon="alert-circle-outline" title="Category not found" body="" /></Screen>;
  }

  return (
    <Screen>
      <AppBar title={category.name} subtitle={budget ? `Budget ${money(budget.amount)} per cycle` : 'No budget set'} back large right={<><PeriodChip /><IconButton name="pencil-outline" onPress={() => router.push(`/budgets/edit?categoryId=${categoryId}`)} testID="edit-budget" /></>} />
      <Card>
        <Row gap={16}>
          {p ? <Ring value={p.pct} color={tone} size={84} stroke={10} /> : <TileIcon name={category.icon} color={category.color} size={64} />}
          <View style={{ flex: 1 }}>
            <Txt v="caption">Spent {period.isCurrent ? 'this cycle' : 'in period'}</Txt>
            <Txt v="h1" tabular color={p?.status === 'over' ? colors.expenseInk : colors.ink}>{money(spent)}</Txt>
            {p ? (
              <Row gap={8} style={{ marginTop: 6 }}>
                {p.status === 'over' ? <Pill tone="over" label={`Over by ${money(-p.remaining)}`} /> : <Pill tone={p.status === 'warn' ? 'warn' : 'ok'} label={`${money(p.remaining)} left`} />}
              </Row>
            ) : null}
          </View>
        </Row>
        {p && budget ? (
          <View style={{ marginTop: 14 }}>
            <ProgressBar value={p.pct} tone={p.status === 'over' ? 'over' : p.status === 'warn' ? 'warn' : 'primary'} height={10} />
            <Row between style={{ marginTop: 6 }}>
              <Txt v="caption">{p.pct}% of {money(budget.amount)}</Txt>
              {period.isCurrent && day.daysLeft > 0 ? <Txt v="caption">{money(dailyAllowance(p.remaining, day.daysLeft))}/day for {day.daysLeft} days</Txt> : null}
            </Row>
          </View>
        ) : (
          <Button label="Set a budget" icon="target" variant="secondary" onPress={() => router.push(`/budgets/edit?categoryId=${categoryId}`)} style={{ marginTop: 14 }} />
        )}
      </Card>
      <Row gap={10} style={{ marginBottom: 14 }}>
        <KpiTile label="Transactions" value={String(catTxns.length)} />
        <KpiTile label="Average" value={money(catTxns.length ? spent / catTxns.length : 0, { compact: true })} />
        <KpiTile label="Largest" value={money(Math.max(0, ...catTxns.map((t) => t.amount)), { compact: true })} tone="expense" />
      </Row>
      <Card>
        <CardTitle title="Last 6 cycles" sub={budget ? `budget ${money(budget.amount, { compact: true })}` : undefined} />
        <BarChart groups={history.map((h) => ({ label: h.c.short, values: budget ? [h.v, budget.amount] : [h.v], highlight: h.c.key === period.cycle.key }))} colors={[category.color, colors.ink4]} height={150} indian={settings.currency === 'INR'} />
        <Legend items={[{ label: 'Spent', color: category.color }, ...(budget ? [{ label: 'Budget', color: colors.ink4 }] : [])]} />
      </Card>
      <Card>
        <CardTitle title="Transactions" sub={period.label} />
        {catTxns.length === 0 ? <Txt v="muted">No expenses in this category for the period.</Txt> : catTxns.map((t, i) => <TxnRow key={t.id} txn={t} last={i === catTxns.length - 1} onPress={() => router.push(`/transaction/${t.id}`)} />)}
      </Card>
    </Screen>
  );
}
