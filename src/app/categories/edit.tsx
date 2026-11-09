import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { useCategory } from '@/store/selectors';
import { useToast } from '@/components/ui/Toast';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/domain/defaults';
import { newId } from '@/domain/ids';
import type { Subcategory } from '@/domain/types';
import { AppBar, Button, Card, Chip, ListItem, Note, Row, Screen, Segmented } from '@/components/ui/Primitives';
import { ConfirmDialog, Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { Icon, TileIcon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';

export default function CategoryEdit() {
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const existing = useCategory(params.id);
  const categories = useStore((s) => s.categories);
  const txns = useStore((s) => s.transactions);
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const [kind, setKind] = useState<'expense' | 'income'>(existing?.kind ?? ((params.kind as 'expense' | 'income') || 'expense'));
  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? CATEGORY_ICONS[0]);
  const [color, setColor] = useState(existing?.color ?? CATEGORY_COLORS[0]);
  const [subs, setSubs] = useState<Subcategory[]>(existing?.subcategories ?? []);
  const [newSub, setNewSub] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const usage = existing ? txns.filter((t) => t.categoryId === existing.id).length : 0;
  const isFallback = existing?.id === 'cat_others' || existing?.id === 'inc_other';

  const addSub = () => {
    const n = newSub.trim();
    if (!n) return;
    if (subs.some((s) => s.name.toLowerCase() === n.toLowerCase())) { toast('Subcategory already exists', { tone: 'warn' }); return; }
    setSubs([...subs, { id: newId('sub_'), name: n }]);
    setNewSub('');
  };

  const save = () => {
    const n = name.trim();
    if (!n) { toast('Give the category a name', { tone: 'warn' }); return; }
    if (existing) {
      updateCategory(existing.id, { name: n, icon, color, subcategories: subs });
      toast('Category updated', { tone: 'ok' });
    } else {
      addCategory({ name: n, kind, icon, color, subcategories: subs });
      toast('Category created', { tone: 'ok' });
    }
    router.back();
  };

  const doDelete = (moveTo?: string) => {
    if (!existing) return;
    deleteCategory(existing.id, moveTo);
    setConfirm(false);
    setMoveOpen(false);
    toast('Category deleted', { tone: 'ok' });
    router.back();
  };

  return (
    <Screen>
      <AppBar title={existing ? 'Edit category' : 'New category'} subtitle={existing?.isDefault ? 'Default category' : undefined} back />
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        <TileIcon name={icon} color={color} size={76} />
      </View>
      {!existing ? <Segmented options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} value={kind} onChange={setKind} /> : null}
      <TextField label="Name" placeholder="e.g. Pet care" value={name} onChangeText={setName} icon="tag-outline" testID="category-name" />

      <Card flat>
        <Txt v="label" style={{ marginBottom: 8 }}>Subcategories</Txt>
        <Row gap={6} style={{ flexWrap: 'wrap', marginBottom: 8 }}>
          {subs.map((s) => <Chip key={s.id} label={s.name} trailingIcon="close" onPress={() => setSubs(subs.filter((x) => x.id !== s.id))} />)}
          {subs.length === 0 ? <Txt v="muted">None yet</Txt> : null}
        </Row>
        <Row gap={8}>
          <TextField placeholder="Add subcategory" value={newSub} onChangeText={setNewSub} onSubmitEditing={addSub} returnKeyType="done" style={{ flex: 1, marginBottom: 0 }} testID="sub-input" />
          <Button label="Add" size="sm" variant="secondary" onPress={addSub} testID="sub-add" />
        </Row>
      </Card>

      <Card flat>
        <Txt v="label" style={{ marginBottom: 8 }}>Icon</Txt>
        <Row gap={6} style={{ flexWrap: 'wrap', marginBottom: 14 }}>
          {CATEGORY_ICONS.map((i) => (
            <Pressable key={i} onPress={() => setIcon(i)} style={{ borderRadius: 12, borderWidth: 2, borderColor: icon === i ? colors.primary : 'transparent', padding: 1 }}>
              <TileIcon name={i} color={color} size={34} soft={icon !== i} />
            </Pressable>
          ))}
        </Row>
        <Txt v="label" style={{ marginBottom: 8 }}>Colour</Txt>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {CATEGORY_COLORS.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, borderWidth: 3, borderColor: color === c ? colors.ink : 'transparent' }} />
          ))}
        </Row>
      </Card>

      {existing && isFallback ? <Note tone="info">This is the fallback category for deleted categories and cannot be removed.</Note> : null}
      <Row gap={10}>
        {existing && !isFallback ? <Button label="Delete" icon="trash-can-outline" variant="dangerGhost" onPress={() => (usage > 0 ? setMoveOpen(true) : setConfirm(true))} style={{ flex: 1 }} testID="delete-category" /> : null}
        <Button label={existing ? 'Save changes' : 'Create category'} icon="check" onPress={save} style={{ flex: 2 }} testID="save-category" />
      </Row>

      <ConfirmDialog visible={confirm} onClose={() => setConfirm(false)} title="Delete category?" body={`${existing?.name} will be removed. Any budget for it is removed too.`} onConfirm={() => doDelete()} />
      <Sheet visible={moveOpen} onClose={() => setMoveOpen(false)} title="Move transactions first" subtitle={`${usage} transaction${usage === 1 ? '' : 's'} use ${existing?.name}. Choose where they should go.`}>
        {categories.filter((c) => c.kind === kind && c.id !== existing?.id && !c.archived).map((c, i, arr) => (
          <ListItem key={c.id} left={<TileIcon name={c.icon} color={c.color} size={36} />} title={c.name} onPress={() => doDelete(c.id)} last={i === arr.length - 1} right={<Icon name="arrow-right" size={18} color={colors.ink3} />} />
        ))}
      </Sheet>
    </Screen>
  );
}
