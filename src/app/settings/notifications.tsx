import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/ui/Toast';
import { ensurePermission, sendBudgetAlert, syncReminderSchedule } from '@/services/notifications';
import { AppBar, Button, Card, Chip, ListItem, Note, Row, Screen, Switch } from '@/components/ui/Primitives';
import { Icon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';

export default function NotificationSettings() {
  const { colors } = useTheme();
  const toast = useToast();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const r = settings.reminder;
  const b = settings.budgetAlerts;
  const [busy, setBusy] = useState(false);

  const setReminder = (patch: Partial<typeof r>) => updateSettings({ reminder: { ...r, ...patch } });
  const setAlerts = (patch: Partial<typeof b>) => updateSettings({ budgetAlerts: { ...b, ...patch } });
  const h12 = r.hour % 12 || 12;
  const ampm = r.hour >= 12 ? 'PM' : 'AM';

  const test = async () => {
    setBusy(true);
    try {
      if (Platform.OS === 'web') { toast('OS notifications are only available in the mobile app. The in-app reminder still works here.', { tone: 'info' }); return; }
      if (!(await ensurePermission())) { toast('Notification permission denied', { tone: 'warn' }); return; }
      await sendBudgetAlert('Test notification', 'Budget alerts and daily reminders are working.');
      const n = await syncReminderSchedule();
      toast(`Sent. ${n} reminder${n === 1 ? '' : 's'} scheduled.`, { tone: 'ok' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppBar title="Notifications" back />
      <Txt v="label" style={{ marginBottom: 8 }}>Daily expense reminder</Txt>
      <Card style={{ paddingVertical: 4 }}>
        <ListItem left={<Icon name="bell-ring-outline" />} title="Remind me to log expenses" subtitle="Only if nothing was recorded that day" right={<Switch value={r.enabled} onChange={(v) => setReminder({ enabled: v })} testID="reminder-toggle" />} />
        <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Txt v="bodyStrong">Reminder time</Txt>
          <Row between style={{ marginTop: 8, backgroundColor: colors.surface2, borderRadius: 12, padding: 8 }}>
            <Step label="Hour" value={String(h12)} onDec={() => setReminder({ hour: (r.hour + 23) % 24 })} onInc={() => setReminder({ hour: (r.hour + 1) % 24 })} />
            <Step label="Min" value={String(r.minute).padStart(2, '0')} onDec={() => setReminder({ minute: (r.minute + 45) % 60 })} onInc={() => setReminder({ minute: (r.minute + 15) % 60 })} />
            <Pressable onPress={() => setReminder({ hour: (r.hour + 12) % 24 })} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primarySoft }}>
              <Txt v="bodyStrong" color={colors.primaryInk}>{ampm}</Txt>
            </Pressable>
          </Row>
        </View>
        <View style={{ paddingVertical: 10 }}>
          <Txt v="bodyStrong">Quiet from</Txt>
          <Txt v="muted" style={{ marginBottom: 8 }}>&quot;Remind me later&quot; won&apos;t offer times after this hour.</Txt>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {[21, 22, 23, 24].map((h) => <Chip key={h} label={h === 24 ? 'Midnight' : `${h % 12 || 12} PM`} active={r.quietFromHour === h} onPress={() => setReminder({ quietFromHour: h })} />)}
          </Row>
        </View>
      </Card>

      <Txt v="label" style={{ marginBottom: 8 }}>Budget alerts</Txt>
      <Card style={{ paddingVertical: 4 }}>
        <ListItem left={<Icon name="chart-donut" />} title="Alert when a category budget is reached" right={<Switch value={b.enabled} onChange={(v) => setAlerts({ enabled: v })} testID="budget-alerts-toggle" />} />
        <View style={{ paddingVertical: 10 }}>
          <Txt v="bodyStrong" style={{ marginBottom: 8 }}>Warn at</Txt>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {[50, 75, 80, 90, 100].map((th) => {
              const on = b.thresholds.includes(th);
              return <Chip key={th} label={`${th}%`} active={on} onPress={() => setAlerts({ thresholds: (on ? b.thresholds.filter((x) => x !== th) : [...b.thresholds, th]).sort((x, y) => x - y) })} />;
            })}
          </Row>
          <Txt v="caption" style={{ marginTop: 8 }}>Each threshold fires at most once per category per cycle.</Txt>
        </View>
      </Card>

      <Note tone="info">Reminders are scheduled on the device for the next 7 days and re-planned whenever you add a transaction, so you are never reminded on a day you already logged an expense.</Note>
      <Button label="Send test notification" icon="send" variant="secondary" onPress={test} loading={busy} testID="test-notification" />
    </Screen>
  );
}

function Step({ label, value, onInc, onDec }: { label: string; value: string; onInc: () => void; onDec: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <Txt v="caption">{label}</Txt>
      <Row gap={6}>
        <Pressable onPress={onDec} hitSlop={6} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}><Icon name="minus" size={16} /></Pressable>
        <Txt v="h2" tabular style={{ width: 34, textAlign: 'center' }}>{value}</Txt>
        <Pressable onPress={onInc} hitSlop={6} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}><Icon name="plus" size={16} /></Pressable>
      </Row>
    </View>
  );
}
