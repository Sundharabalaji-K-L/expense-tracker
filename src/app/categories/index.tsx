import React, { useState } from 'react';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useCategoriesByKind } from '@/store/selectors';
import { AppBar, Button, Card, IconButton, ListItem, Pill, Screen, Segmented } from '@/components/ui/Primitives';
import { TileIcon } from '@/components/ui/Icon';

export default function Categories() {
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const cats = useCategoriesByKind(kind);
  const expenseCount = useCategoriesByKind('expense').length;
  const incomeCount = useCategoriesByKind('income').length;
  const budgets = useStore((s) => s.budgets);
  const txns = useStore((s) => s.transactions);
  const count = (id: string) => txns.filter((t) => t.categoryId === id).length;
  return (
    <Screen>
      <AppBar title="Categories" back right={<IconButton name="plus" onPress={() => router.push(`/categories/edit?kind=${kind}`)} testID="add-category" />} />
      <Segmented options={[{ value: 'expense', label: `Expense (${expenseCount})` }, { value: 'income', label: `Income (${incomeCount})` }]} value={kind} onChange={setKind} />
      <Card style={{ paddingVertical: 4 }}>
        {cats.map((c, i) => (
          <ListItem
            key={c.id}
            testID={`category-${c.id}`}
            left={<TileIcon name={c.icon} color={c.color} size={40} />}
            title={c.name}
            subtitle={c.subcategories.length ? c.subcategories.map((s) => s.name).join(' · ') : `${count(c.id)} transactions`}
            right={!c.isDefault ? <Pill tone="info" label="Custom" /> : budgets.some((b) => b.categoryId === c.id) ? <Pill tone="ok" label="Budget" /> : undefined}
            chevron
            onPress={() => router.push(`/categories/edit?id=${c.id}`)}
            last={i === cats.length - 1}
          />
        ))}
      </Card>
      <Button label={`New ${kind} category`} icon="plus" variant="secondary" onPress={() => router.push(`/categories/edit?kind=${kind}`)} />
    </Screen>
  );
}
