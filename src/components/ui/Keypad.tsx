import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';
import { Txt } from './Txt';

/** Applies a key to the current amount string, enforcing one decimal point and two decimals. */
export function applyKey(current: string, key: string): string {
  if (key === 'back') return current.length <= 1 ? '0' : current.slice(0, -1);
  if (key === 'clear') return '0';
  if (key === '.') return current.includes('.') ? current : `${current}.`;
  if (!/^\d$/.test(key)) return current;
  const [int, frac] = current.split('.');
  if (frac !== undefined) return frac.length >= 2 ? current : `${current}${key}`;
  if (int === '0') return key;
  if (int.length >= 9) return current;
  return `${current}${key}`;
}

export function Keypad({ value, onChange, onDone, doneLabel = 'Done' }: { value: string; onChange: (v: string) => void; onDone?: () => void; doneLabel?: string }) {
  const { colors } = useTheme();
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'back'];
  const Key = ({ k }: { k: string }) => (
    <Pressable
      testID={`key-${k}`}
      onPress={() => onChange(applyKey(value, k))}
      onLongPress={k === 'back' ? () => onChange('0') : undefined}
      style={({ pressed }) => ({ width: '31%', height: 52, borderRadius: 12, backgroundColor: pressed ? colors.surface3 : colors.surface2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' })}
    >
      {k === 'back' ? <Icon name="backspace-outline" size={22} color={colors.ink2} /> : <Txt v="h2" style={{ fontSize: 20 }}>{k}</Txt>}
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 3, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
        {keys.map((k) => <Key key={k} k={k} />)}
      </View>
      {onDone ? (
        <Pressable testID="keypad-done" onPress={onDone} style={({ pressed }) => ({ flex: 1, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
          <Icon name="check" size={26} color="#fff" />
          <Txt v="caption" color="#fff" style={{ fontWeight: '700', marginTop: 2 }}>{doneLabel}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
