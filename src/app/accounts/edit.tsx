import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { useAccount } from '@/store/selectors';
import { useToast } from '@/components/ui/Toast';
import { ACCOUNT_PRESETS, CATEGORY_COLORS } from '@/domain/defaults';
import { parseAmount } from '@/domain/money';
import type { AccountType } from '@/domain/types';
import { AppBar, Button, Card, Note, Row, Screen } from '@/components/ui/Primitives';
import { TextField } from '@/components/ui/TextField';
import { TileIcon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';

const ICONS = ['bank', 'cash', 'cellphone', 'credit-card', 'wallet', 'piggy-bank', 'safe', 'bitcoin', 'chart-line', 'briefcase', 'home', 'gift'];

export default function AccountEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const existing = useAccount(id);
  const addAccount = useStore((s) => s.addAccount);
  const updateAccount = useStore((s) => s.updateAccount);
  const [type, setType] = useState<AccountType>(existing?.type ?? 'bank');
  const [name, setName] = useState(existing?.name ?? '');
  const [opening, setOpening] = useState(existing ? String(Math.abs(existing.openingBalance)) : '');
  const [limit, setLimit] = useState(existing?.creditLimit ? String(existing.creditLimit) : '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [color, setColor] = useState(existing?.color ?? ACCOUNT_PRESETS[0].color);
  const [icon, setIcon] = useState(existing?.icon ?? ACCOUNT_PRESETS[0].icon);

  const pickType = (t: AccountType) => {
    setType(t);
    if (!existing) {
      const p = ACCOUNT_PRESETS.find((x) => x.type === t)!;
      setColor(p.color);
      setIcon(p.icon);
    }
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) { toast('Give the account a name', { tone: 'warn' }); return; }
    const payload = { name: trimmed, type, openingBalance: type === 'credit' ? -Math.abs(parseAmount(opening)) : parseAmount(opening), color, icon, note: note.trim() || undefined, creditLimit: type === 'credit' && parseAmount(limit) > 0 ? parseAmount(limit) : undefined };
    if (existing) {
      updateAccount(existing.id, payload);
      toast('Account updated', { tone: 'ok' });
    } else {
      addAccount(payload);
      toast('Account added', { tone: 'ok' });
    }
    router.back();
  };

  return (
    <Screen>
      <AppBar title={existing ? 'Edit account' : 'New account'} back />
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        <TileIcon name={icon} color={color} size={72} />
      </View>
      <Txt v="label" style={{ marginBottom: 8 }}>Type</Txt>
      <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 16 }}>
        {ACCOUNT_PRESETS.map((p) => (
          <Pressable key={p.type} testID={`type-${p.type}`} onPress={() => pickType(p.type)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: type === p.type ? colors.primary : colors.border, backgroundColor: type === p.type ? colors.primarySoft : colors.surface }}>
            <TileIcon name={p.icon} color={p.color} size={24} />
            <Txt v="small" style={{ fontWeight: '700' }}>{p.label}</Txt>
          </Pressable>
        ))}
      </Row>
      <TextField label="Name" placeholder="e.g. HDFC Savings" value={name} onChangeText={setName} icon="tag-outline" testID="account-name" />
      <TextField label={type === 'credit' ? 'Current outstanding (dues)' : existing ? 'Opening balance' : 'Current balance'} placeholder="0" keyboardType="decimal-pad" value={opening} onChangeText={setOpening} icon="cash" testID="account-balance" />
      {type === 'credit' ? <TextField label="Credit limit (optional)" placeholder="e.g. 100000" keyboardType="decimal-pad" value={limit} onChangeText={setLimit} icon="credit-card-settings-outline" /> : null}
      <TextField label="Note (optional)" placeholder="e.g. Salary account · ••4521" value={note} onChangeText={setNote} icon="note-text-outline" />
      {existing ? <Note tone="info">Balance is derived from the opening balance and transactions. Edit the opening balance to correct it.</Note> : null}

      <Card flat>
        <Txt v="label" style={{ marginBottom: 8 }}>Icon</Txt>
        <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 14 }}>
          {ICONS.map((i) => (
            <Pressable key={i} onPress={() => setIcon(i)} style={{ borderRadius: 13, borderWidth: 2, borderColor: icon === i ? colors.primary : 'transparent', padding: 2 }}>
              <TileIcon name={i} color={color} size={38} soft={icon !== i} />
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
      <Button label={existing ? 'Save changes' : 'Add account'} icon="check" onPress={save} testID="save-account" />
    </Screen>
  );
}
