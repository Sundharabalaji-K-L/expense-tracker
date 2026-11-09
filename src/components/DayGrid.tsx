import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { CycleStartDay } from '@/domain/types';
import { Txt } from './ui/Txt';

/** Picker for the salary-cycle start day. */
export function DayGrid({ value, onChange }: { value: CycleStartDay; onChange: (d: CycleStartDay) => void }) {
  const { colors } = useTheme();
  const days: CycleStartDay[] = [1, 5, 7, 10, 15, 20, 25, 26, 27, 28, 29, 30, 31, 'last'];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {days.map((d) => {
        const on = d === value;
        return (
          <Pressable key={String(d)} onPress={() => onChange(d)} testID={`day-${d}`} style={{ minWidth: 44, paddingHorizontal: 10, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.primary : colors.surface2, borderWidth: 1, borderColor: on ? colors.primary : colors.border }}>
            <Txt v="small" color={on ? '#fff' : colors.ink} style={{ fontWeight: '700' }}>{d === 'last' ? 'Last day' : d}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
