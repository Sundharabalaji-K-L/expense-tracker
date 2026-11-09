import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore, useUiStore } from '@/store/useStore';
import { usePeriod, usePeriodTransactions } from '@/store/selectors';
import { useMoney } from '@/hooks/useMoney';
import { useToast } from '@/components/ui/Toast';
import { changePercent, dailySeries, expenseByAccount, expenseByCategory, filterTransactions, totals, weeklySeries } from '@/domain/analytics';
import { allBudgetProgress } from '@/domain/budgets';
import { cycleConfigFromSettings, previousCycle, recentCycles } from '@/domain/cycle';
import { reportToHTML, transactionsToCSV } from '@/domain/exporters';
import { exportCSV, exportPDF } from '@/services/exporter';
import { AppBar, Button, Card, CardTitle, Chip, IconButton, ListItem, Radio, Row, Screen } from '@/components/ui/Primitives';
import { Sheet } from '@/components/ui/Sheet';
import { TileIcon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { AccountSheet, PeriodChip } from '@/components/Pickers';
import { BarChart, Doughnut, HBarChart, Legend, LineChart } from '@/components/charts/Charts';

type Tab = 'daily' | 'weekly' | 'cycle' | 'compare';

export default function Reports() {
  const { colors, series } = useTheme();
  const money = useMoney();
  const toast = useToast();
  const all = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const budgets = useStore((s) => s.budgets);
  const settings = useStore((s) => s.settings);
  const { accountFilter, setAccountFilter } = useUiStore();
  const period = usePeriod();
  const txns = usePeriodTransactions();
  const [tab, setTab] = useState<Tab>('cycle');
  const [accOpen, setAccOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportKind, setExportKind] = useState<'csv' | 'pdf'>('csv');
  const [busy, setBusy] = useState(false);
  const indian = settings.currency === 'INR';
  const cfg = cycleConfigFromSettings(settings);
  const account = accounts.find((a) => a.id === accountFilter);

  const t = useMemo(() => totals(txns, accountFilter), [txns, accountFilter]);
  const daily = useMemo(() => dailySeries(txns, period.range), [txns, period.range]);
  const weekly = useMemo(() => weeklySeries(txns, period.range), [txns, period.range]);
  const byCat = useMemo(() => expenseByCategory(txns), [txns]);
  const byAcc = useMemo(() => expenseByAccount(txns, accounts), [txns, accounts]);
  const prev = useMemo(() => previousCycle(period.cycle, cfg), [period.cycle, cfg]);
  const prevTxns = useMemo(() => filterTransactions(all, { range: prev, accountId: accountFilter }), [all, prev, accountFilter]);
  const prevByCat = useMemo(() => expenseByCategory(prevTxns), [prevTxns]);
  const prevT = useMemo(() => totals(prevTxns, accountFilter), [prevTxns, accountFilter]);
  const history = useMemo(() => recentCycles(period.cycle.start, 6, cfg).map((c) => ({ c, t: totals(filterTransactions(all, { range: c, accountId: accountFilter }), accountFilter) })), [all, period.cycle.start, cfg, accountFilter]);
  const avgDaily = daily.length ? t.expense / Math.max(1, daily.filter((d) => d.date <= new Date()).length) : 0;
  const topDays = [...daily].sort((a, b) => b.expense - a.expense).slice(0, 3).filter((d) => d.expense > 0);

  const doExport = async () => {
    setBusy(true);
    try {
      const ctx = { accounts, categories, currency: settings.currency, rangeLabel: `${period.label}${account ? ` · ${account.name}` : ''}` };
      if (exportKind === 'csv') await exportCSV(transactionsToCSV(txns, ctx), `transactions-${period.cycle.key}`);
      else await exportPDF(reportToHTML(txns, allBudgetProgress(budgets, txns), ctx), `report-${period.cycle.key}`);
      toast('Export ready', { tone: 'ok' });
      setExportOpen(false);
    } catch {
      toast('Export could not be completed. Please try again.', { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppBar title="Reports" large right={<><PeriodChip /><IconButton name="export-variant" onPress={() => setExportOpen(true)} testID="open-export" /></>} />
      <Row gap={18} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 12 }}>
        {(['daily', 'weekly', 'cycle', 'compare'] as Tab[]).map((k) => (
          <Pressable key={k} testID={`tab-${k}`} onPress={() => setTab(k)} style={{ paddingVertical: 9, borderBottomWidth: 2, borderBottomColor: tab === k ? colors.primary : 'transparent' }}>
            <Txt v="small" color={tab === k ? colors.primaryInk : colors.ink3} style={{ fontWeight: '700' }}>{k[0].toUpperCase() + k.slice(1)}</Txt>
          </Pressable>
        ))}
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
        <Chip label={account ? account.name : 'All accounts'} icon="wallet-outline" active={!!account} trailingIcon="chevron-down" onPress={() => setAccOpen(true)} />
        {account ? <Chip label="Clear" icon="close" onPress={() => setAccountFilter(null)} /> : null}
      </ScrollView>

      {tab === 'daily' && (
        <>
          <Card>
            <CardTitle title="Daily spending" sub={`avg ${money(avgDaily, { compact: true })}/day`} />
            <LineChart points={daily.map((d) => ({ label: format(d.date, 'd MMM'), value: d.expense }))} color={series[0]} average={avgDaily} labels={[format(period.range.start, 'd MMM'), format(new Date((period.range.start.getTime() + period.range.end.getTime()) / 2), 'd MMM'), format(new Date(period.range.end.getTime() - 1), 'd MMM')]} indian={indian} />
          </Card>
          <Card>
            <CardTitle title="Highest spending days" />
            {topDays.length === 0 ? <Txt v="muted">No expenses yet.</Txt> : topDays.map((d, i) => (
              <ListItem key={d.key} title={format(d.date, 'EEEE, d MMM')} subtitle={`${txns.filter((x) => x.type === 'expense' && x.date.startsWith(d.key)).length} expenses`} right={<Txt v="bodyStrong" color={colors.expenseInk} tabular>−{money(d.expense)}</Txt>} last={i === topDays.length - 1} />
            ))}
          </Card>
        </>
      )}

      {tab === 'weekly' && (
        <Card>
          <CardTitle title="Income vs expenses by week" sub={period.label} />
          <BarChart groups={weekly.map((w) => ({ label: `${w.label} · ${format(w.start, 'd MMM')}`, values: [w.income, w.expense] }))} colors={[colors.income, colors.expense]} height={170} indian={indian} />
          <Legend items={[{ label: 'Income', color: colors.income }, { label: 'Expense', color: colors.expense }]} />
          {weekly.map((w, i) => (
            <ListItem key={i} title={`Week ${i + 1}`} subtitle={`from ${format(w.start, 'd MMM')}`} right={<View style={{ alignItems: 'flex-end' }}><Txt v="small" color={colors.expenseInk} tabular style={{ fontWeight: '700' }}>−{money(w.expense)}</Txt>{w.income > 0 ? <Txt v="caption" color={colors.incomeInk} tabular>+{money(w.income)}</Txt> : null}</View>} last={i === weekly.length - 1} />
          ))}
        </Card>
      )}

      {tab === 'cycle' && (
        <>
          <Card>
            <CardTitle title="Where your money went" sub={money(t.expense)} />
            {byCat.length === 0 ? <Txt v="muted">No expenses in this period.</Txt> : (
              <>
                <Row gap={16} center={false}>
                  <Doughnut slices={byCat.slice(0, 6).map((s, i) => ({ value: s.amount, color: i < 5 ? series[i] : colors.ink4 }))} size={120} centerTop="Spent" centerBottom={money(t.expense, { compact: true })} />
                  <View style={{ flex: 1 }}>
                    {byCat.slice(0, 6).map((s, i) => {
                      const c = categories.find((x) => x.id === s.categoryId);
                      return (
                        <Row key={s.categoryId} between style={{ paddingVertical: 3 }}>
                          <Row gap={8} style={{ flex: 1 }}><View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: i < 5 ? series[i] : colors.ink4 }} /><Txt v="small" numberOfLines={1} style={{ flex: 1 }}>{c?.name ?? 'Other'}</Txt></Row>
                          <Txt v="small" tabular style={{ fontWeight: '700' }}>{Math.round(s.share * 100)}%</Txt>
                        </Row>
                      );
                    })}
                  </View>
                </Row>
              </>
            )}
          </Card>
          <Card>
            <CardTitle title="Top categories" sub={`vs ${prev.label}`} />
            {byCat.slice(0, 6).map((s, i) => {
              const c = categories.find((x) => x.id === s.categoryId);
              const p = prevByCat.find((x) => x.categoryId === s.categoryId)?.amount ?? 0;
              const ch = changePercent(s.amount, p);
              return (
                <ListItem key={s.categoryId} left={<TileIcon name={c?.icon ?? 'help'} color={c?.color ?? colors.ink3} size={36} />} title={c?.name ?? 'Other'} subtitle={`${s.count} transaction${s.count === 1 ? '' : 's'}`} right={<View style={{ alignItems: 'flex-end' }}><Txt v="bodyStrong" tabular>{money(s.amount)}</Txt><Txt v="caption" color={ch === null ? colors.ink3 : ch > 0 ? colors.expenseInk : colors.incomeInk}>{ch === null ? 'new' : `${ch > 0 ? '▲' : '▼'} ${Math.abs(ch)}% vs last cycle`}</Txt></View>} onPress={() => router.push(`/budgets/${s.categoryId}`)} last={i === Math.min(5, byCat.length - 1)} />
              );
            })}
            {byCat.length === 0 ? <Txt v="muted">No expenses yet.</Txt> : null}
          </Card>
          {!account && byAcc.length > 0 ? (
            <Card>
              <CardTitle title="Expenses by account" />
              <HBarChart rows={byAcc.map((x) => ({ label: accounts.find((a) => a.id === x.accountId)?.name ?? '', value: x.amount, color: accounts.find((a) => a.id === x.accountId)?.color }))} color={series[0]} formatValue={(v) => money(v, { compact: true })} />
            </Card>
          ) : null}
        </>
      )}

      {tab === 'compare' && (
        <>
          <Card>
            <CardTitle title="Last 6 cycles" sub="income vs expense" />
            <BarChart groups={history.map((h) => ({ label: h.c.short, values: [h.t.income, h.t.expense], highlight: h.c.key === period.cycle.key }))} colors={[colors.income, colors.expense]} height={170} indian={indian} />
            <Legend items={[{ label: 'Income', color: colors.income }, { label: 'Expense', color: colors.expense }]} />
          </Card>
          <Card>
            <CardTitle title={`This cycle vs ${prev.short}`} />
            {[
              { k: 'Income', a: t.income, b: prevT.income, good: 'up' },
              { k: 'Expenses', a: t.expense, b: prevT.expense, good: 'down' },
              { k: 'Net savings', a: t.net, b: prevT.net, good: 'up' },
            ].map((r, i) => {
              const ch = changePercent(Math.abs(r.a), Math.abs(r.b));
              const positive = ch !== null && ((r.good === 'up' && ch > 0) || (r.good === 'down' && ch < 0));
              return (
                <ListItem key={r.k} title={r.k} subtitle={`${prev.short}: ${money(r.b)}`} right={<View style={{ alignItems: 'flex-end' }}><Txt v="bodyStrong" tabular>{money(r.a)}</Txt>{ch !== null ? <Txt v="caption" color={positive ? colors.incomeInk : colors.expenseInk}>{ch > 0 ? '▲' : ch < 0 ? '▼' : '•'} {Math.abs(ch)}%</Txt> : null}</View>} last={i === 2} />
              );
            })}
          </Card>
          <Card style={{ paddingVertical: 4 }}>
            {history.slice().reverse().map((h, i) => (
              <ListItem key={h.c.key} title={h.c.label} subtitle={`${format(h.c.start, 'yyyy')}`} right={<View style={{ alignItems: 'flex-end' }}><Txt v="small" color={colors.expenseInk} tabular style={{ fontWeight: '700' }}>−{money(h.t.expense)}</Txt><Txt v="caption" color={colors.incomeInk} tabular>+{money(h.t.income)}</Txt></View>} last={i === history.length - 1} />
            ))}
          </Card>
        </>
      )}

      <AccountSheet visible={accOpen} onClose={() => setAccOpen(false)} title="Filter by account" onSelect={(a) => setAccountFilter(a.id)} />
      <Sheet visible={exportOpen} onClose={() => setExportOpen(false)} title="Export" subtitle={`${period.label}${account ? ` · ${account.name}` : ' · all accounts'} · ${txns.length} transactions`}>
        <ListItem left={<Radio on={exportKind === 'csv'} />} title="CSV / Excel" subtitle="Every transaction with category, account and note" onPress={() => setExportKind('csv')} />
        <ListItem left={<Radio on={exportKind === 'pdf'} />} title="PDF report" subtitle="Summary, category breakdown, budgets and transactions" onPress={() => setExportKind('pdf')} last />
        <View style={{ height: 12 }} />
        <Button label={exportKind === 'csv' ? 'Share CSV' : 'Share PDF'} icon="share-variant" onPress={doExport} loading={busy} testID="do-export" />
      </Sheet>
    </Screen>
  );
}
