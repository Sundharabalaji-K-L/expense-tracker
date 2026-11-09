import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { usePeriod, usePeriodTransactions } from '@/store/selectors';
import { useMoney } from '@/hooks/useMoney';
import { allBudgetProgress, budgetSummary, dailyAllowance, type BudgetProgress } from '@/domain/budgets';
import { cycleDayInfo } from '@/domain/cycle';
import { AppBar, Button, Card, EmptyState, IconButton, Pill, ProgressBar, Row, Screen } from '@/components/ui/Primitives';
import { TileIcon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { PeriodChip } from '@/components/Pickers';
import { Ring } from '@/components/charts/Charts';

export default function Budgets() {
  const { colors } = useTheme();
  const money = useMoney();
  const budgets = useStore((s) => s.budgets);
  const categories = useStore((s) => s.categories);
  const thresholds = useStore((s) => s.settings.budgetAlerts.thresholds);
  const period = usePeriod();
  const txns = usePeriodTransactions(null);
  const progress = useMemo(() => allBudgetProgress(budgets, txns, thresholds[0] ?? 80), [budgets, txns, thresholds]);
  const sum = useMemo(() => budgetSummary(progress), [progress]);
  const day = cycleDayInfo(period.cycle, new Date());
  const allowance = dailyAllowance(sum.remaining, day.daysLeft);
  const unbudgeted = categories.filter((c) => c.kind === 'expense' && !c.archived && !budgets.some((b) => b.categoryId === c.id));
  const tone = sum.pct >= 100 ? 'over' : sum.pct >= (thresholds[0] ?? 80) ? 'warn' : 'primary';

  return (
    <Screen>
      <AppBar title="Budgets" subtitle={`${period.label} · day ${day.dayIndex} of ${day.totalDays}`} large right={<><PeriodChip /><IconButton name="plus" onPress={() => router.push('/budgets/edit')} testID="add-budget" /></>} />

      {budgets.length === 0 ? (
        <EmptyState icon="target" title="No budgets yet" body="Set a monthly limit per category. We'll track it against your financial cycle and warn you before you overshoot." action={<Button label="Set your first budget" icon="plus" onPress={() => router.push('/budgets/edit')} />} />
      ) : (
        <>
          <Card>
            <Row between center={false}>
              <View>
                <Txt v="caption">Total budget used</Txt>
                <Row gap={6} style={{ marginTop: 2, alignItems: 'baseline' }}>
                  <Txt v="h1" tabular>{money(sum.spent)}</Txt>
                  <Txt v="muted" tabular>/ {money(sum.allocated)}</Txt>
                </Row>
              </View>
              <Ring value={sum.pct} color={tone === 'over' ? colors.expense : tone === 'warn' ? colors.warn : colors.primary} size={62} />
            </Row>
            <ProgressBar value={sum.pct} tone={tone} height={10} />
            <Row between style={{ marginTop: 8 }}>
              <Txt v="muted" tabular>{money(Math.max(0, sum.remaining))} remaining</Txt>
              <Txt v="muted">{sum.pct}% used</Txt>
            </Row>
            {period.isCurrent ? (
              <Txt v="small" color={colors.ink2} style={{ marginTop: 10 }}>
                {sum.remaining >= 0
                  ? `Pace: ${Math.round((day.dayIndex / day.totalDays) * 100)}% of the cycle elapsed, ${sum.pct}% of budget used. ${day.daysLeft > 0 ? `${money(allowance)}/day keeps you on track.` : ''}`
                  : `You are ${money(-sum.remaining)} over the total budget for this cycle.`}
              </Txt>
            ) : null}
          </Card>

          <Card style={{ paddingVertical: 4 }}>
            {progress.map((p, i) => <BudgetRow key={p.budget.id} p={p} last={i === progress.length - 1} />)}
          </Card>
        </>
      )}

      {unbudgeted.length > 0 && budgets.length > 0 ? (
        <Pressable onPress={() => router.push('/budgets/edit')} style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border2, borderRadius: 16, padding: 14, alignItems: 'center' }}>
          <Txt v="small" color={colors.ink3}>+ Set budget for {unbudgeted.slice(0, 3).map((c) => c.name).join(', ')}{unbudgeted.length > 3 ? '…' : ''}</Txt>
        </Pressable>
      ) : null}
    </Screen>
  );
}

export function BudgetRow({ p, last }: { p: BudgetProgress; last?: boolean }) {
  const { colors } = useTheme();
  const money = useMoney();
  const category = useStore((s) => s.categories.find((c) => c.id === p.budget.categoryId));
  const tone = p.status === 'over' ? 'over' : p.status === 'warn' ? 'warn' : 'primary';
  return (
    <Pressable testID={`budget-${p.budget.categoryId}`} onPress={() => router.push(`/budgets/${p.budget.categoryId}`)} style={({ pressed }) => [{ paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]}>
      <Row between style={{ marginBottom: 8 }}>
        <Row gap={10} style={{ flex: 1 }}>
          <TileIcon name={category?.icon ?? 'help'} color={category?.color ?? colors.ink3} size={32} />
          <Txt v="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{category?.name ?? 'Category'}</Txt>
        </Row>
        {p.status === 'over' ? <Pill tone="over" label={`Over by ${money(-p.remaining)}`} /> : p.status === 'warn' ? <Pill tone="warn" label={`${p.pct}% used`} /> : <Pill tone="ok" label="On track" />}
      </Row>
      <ProgressBar value={p.pct} tone={tone} />
      <Row between style={{ marginTop: 6 }}>
        <Txt v="caption" tabular>Spent {money(p.spent)}</Txt>
        <Txt v="caption" tabular>{p.remaining >= 0 ? `Remaining ${money(p.remaining)} of ${money(p.budget.amount)}` : `Budget ${money(p.budget.amount)} · ${p.pct}%`}</Txt>
      </Row>
    </Pressable>
  );
}
