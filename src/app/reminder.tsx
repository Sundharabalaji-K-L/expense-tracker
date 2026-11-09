import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/ui/Toast';
import { markNoSpend, snooze, snoozeOptions } from '@/domain/reminders';
import { formatDateLong } from '@/domain/dates';
import { syncReminderSchedule } from '@/services/notifications';
import { Button, Row } from '@/components/ui/Primitives';
import { Icon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';

/** In-app daily reminder prompt. Presented as a transparent modal over the current screen. */
export default function Reminder() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const settings = useStore((s) => s.settings.reminder);
  const setReminderState = useStore((s) => s.setReminderState);
  const [later, setLater] = useState(mode === 'later');
  const now = useMemo(() => new Date(), []);
  const options = useMemo(() => snoozeOptions(now, settings), [now, settings]);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const noSpend = () => {
    setReminderState((s) => markNoSpend(s, new Date()));
    void syncReminderSchedule();
    toast('Got it. No more reminders today.', { tone: 'ok' });
    close();
  };
  const addExpense = () => {
    close();
    router.push('/transaction/edit?type=expense');
  };
  const pick = (at: Date) => {
    setReminderState((s) => snooze(s, at));
    void syncReminderSchedule();
    toast(`Reminder set for ${format(at, 'h:mm a')}`, { tone: 'ok' });
    close();
  };

  return (
    <Pressable onPress={close} style={{ flex: 1, backgroundColor: colors.backdrop, justifyContent: 'flex-end' }}>
      <Pressable onPress={() => undefined} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 36 }}>
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border2, alignSelf: 'center', marginBottom: 16 }} />
        <Row gap={12} center={false}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell-ring-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="h2">{later ? 'Remind me later' : 'Did you spend anything today?'}</Txt>
            <Txt v="small" color={colors.ink2} style={{ marginTop: 3 }}>{later ? 'Pick another time today. Reminders never carry over to tomorrow.' : `No expenses recorded for ${formatDateLong(now)}. Take 10 seconds to keep your cycle accurate.`}</Txt>
          </View>
        </Row>
        <View style={{ height: 18 }} />
        {!later ? (
          <>
            <Button label="Add expense" icon="plus" onPress={addExpense} testID="reminder-add" />
            <Row gap={10} style={{ marginTop: 10 }}>
              <Button label="No spending today" icon="check" variant="secondary" onPress={noSpend} style={{ flex: 1 }} testID="reminder-nospend" />
              <Button label="Remind me later" icon="clock-outline" variant="ghost" onPress={() => setLater(true)} style={{ flex: 1 }} testID="reminder-later" />
            </Row>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {options.map((o) => (
                <Pressable key={o.label} disabled={o.disabled} onPress={() => pick(o.at)} testID={`snooze-${o.label}`} style={{ width: '31.5%', paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, opacity: o.disabled ? 0.4 : 1 }}>
                  <Txt v="small" style={{ fontWeight: '700', textDecorationLine: o.disabled ? 'line-through' : 'none' }}>{o.label}</Txt>
                </Pressable>
              ))}
            </View>
            {options.every((o) => o.disabled) ? <Txt v="muted" style={{ marginTop: 12 }}>No more slots before your quiet hours ({settings.quietFromHour === 24 ? 'midnight' : `${settings.quietFromHour % 12 || 12} PM`}). The reminder resets tomorrow.</Txt> : null}
            <Row gap={10} style={{ marginTop: 14 }}>
              <Button label="Back" variant="ghost" onPress={() => setLater(false)} style={{ flex: 1 }} />
              <Button label="Dismiss for today" variant="secondary" onPress={close} style={{ flex: 1 }} />
            </Row>
          </>
        )}
      </Pressable>
    </Pressable>
  );
}
