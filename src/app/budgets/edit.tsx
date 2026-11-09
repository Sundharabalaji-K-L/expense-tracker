import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { useCategoriesByKind, useCategory } from '@/store/selectors';
import { useMoney } from '@/hooks/useMoney';
import { useToast } from '@/components/ui/Toast';
import { filterTransactions, spentInCategory } from '@/domain/analytics';
import { cycleConfigFromSettings, recentCycles } from '@/domain/cycle';
import { parseAmount, round2 } from '@/domain/money';
import { AppBar, Button, Card, Chip, ListItem, Note, Row, Screen } from '@/components/ui/Primitives';
import { Keypad } from '@/components/ui/Keypad';
import { Sheet } from '@/components/ui/Sheet';
import { TileIcon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';

export default function BudgetEdit() {
  const { categoryId: paramCat } = useLocalSearchParams<{ categoryId?: string }>();
  const { colors } = useTheme();
  const money = useMoney();
  const toast = useToast();
  const budgets = useStore((s) => s.budgets);
  const txns = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const setBudget = useStore((s) => s.setBudget);
  const removeBudget = useStore((s) => s.removeBudget);
  const cats = useCategoriesByKind('expense');
  const [categoryId, setCategoryId] = useState(paramCat ?? cats.find((c) => !budgets.some((b) => b.categoryId === c.id))?.id ?? cats[0]?.id ?? '');
  const existing = budgets.find((b) => b.categoryId === categoryId);
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '0');
  const [catOpen, setCatOpen] = useState(false);
  const category = useCategory(categoryId);

  const avg = useMemo(() => {
    const cfg = cycleConfigFromSettings(settings);
    const cycles = recentCycles(new Date(), 4, cfg).slice(0, 3);
    const sums = cycles.map((c) => spentInCategory(filterTransactions(txns, { range: c }), categoryId)).filter((v) => v > 0);
    return sums.length ? round2(sums.reduce((s, v) => s + v, 0) / sums.length) : 0;
  }, [txns, settings, categoryId]);
  const suggestions = avg > 0 ? [Math.ceil(avg / 500) * 500, Math.ceil((avg * 1.1) / 500) * 500, Math.ceil((avg * 0.9) / 500) * 500].filter((v, i, a) => a.indexOf(v) === i) : [2000, 5000, 10000];

  const save = () => {
    const n = parseAmount(amount);
    if (!categoryId) { toast('Choose a category', { tone: 'warn' }); return; }
    if (n <= 0) { toast('Enter a budget amount', { tone: 'warn' }); return; }
    setBudget(categoryId, n);
    toast(existing ? 'Budget updated' : 'Budget set', { tone: 'ok' });
    router.back();
  };

  return (
    <Screen>
      <AppBar title={existing ? 'Edit budget' : 'Set budget'} subtitle="Per financial cycle" back />
      <ListItem left={<TileIcon name={category?.icon ?? 'help'} color={category?.color ?? colors.ink3} size={44} />} title={category?.name ?? 'Choose category'} subtitle={existing ? `Current budget ${money(existing.amount)}` : 'Tap to change category'} chevron onPress={() => setCatOpen(true)} testID="budget-category" last />
      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <Txt v="caption">Budget per cycle</Txt>
        <Txt v="display" tabular style={{ fontSize: 42, lineHeight: 48, marginTop: 2 }}>{money(parseAmount(amount), { decimals: 'never' })}</Txt>
      </View>
      <Txt v="label" style={{ marginBottom: 8 }}>{avg > 0 ? `Suggested · avg ${money(avg, { compact: true })} over last cycles` : 'Quick picks'}</Txt>
      <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 14 }}>
        {suggestions.map((s) => <Chip key={s} label={money(s, { decimals: 'never' })} onPress={() => setAmount(String(s))} active={parseAmount(amount) === s} />)}
      </Row>
      <Keypad value={amount} onChange={setAmount} />
      <View style={{ height: 14 }} />
      <Note tone="info">You&apos;ll be notified at {settings.budgetAlerts.thresholds.join('% and ')}% of this budget within the current cycle.</Note>
      <Row gap={10}>
        {existing ? <Button label="Remove" variant="dangerGhost" icon="trash-can-outline" onPress={() => { removeBudget(categoryId); toast('Budget removed', { tone: 'ok' }); router.back(); }} style={{ flex: 1 }} testID="remove-budget" /> : null}
        <Button label={existing ? 'Save budget' : 'Set budget'} icon="check" onPress={save} style={{ flex: 2 }} testID="save-budget" />
      </Row>
      <Sheet visible={catOpen} onClose={() => setCatOpen(false)} title="Category">
        {cats.map((c, i) => {
          const has = budgets.find((b) => b.categoryId === c.id);
          return <ListItem key={c.id} left={<TileIcon name={c.icon} color={c.color} size={36} />} title={c.name} subtitle={has ? `Budget ${money(has.amount)}` : 'No budget yet'} onPress={() => { setCategoryId(c.id); setAmount(has ? String(has.amount) : '0'); setCatOpen(false); }} last={i === cats.length - 1} />;
        })}
      </Sheet>
      <Card flat style={{ marginTop: 14 }}>
        <Txt v="small" color={colors.ink2}>Budgets reset every financial cycle ({settings.cycleMode === 'calendar' ? 'calendar month' : 'salary cycle'}). Change the cycle in Settings.</Txt>
      </Card>
    </Screen>
  );
}
