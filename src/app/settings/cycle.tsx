import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore, useUiStore } from '@/store/useStore';
import { useToast } from '@/components/ui/Toast';
import { describeCycleConfig, getCycle, nextCycle, previousCycle, type CycleConfig } from '@/domain/cycle';
import type { CycleStartDay } from '@/domain/types';
import { AppBar, Button, Card, ListItem, Note, Pill, Radio, Row, Screen } from '@/components/ui/Primitives';
import { Txt } from '@/components/ui/Txt';
import { DayGrid } from '@/components/DayGrid';

export default function CycleSettings() {
  const { colors } = useTheme();
  const toast = useToast();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const setCycleOffset = useUiStore((s) => s.setCycleOffset);
  const [mode, setMode] = useState(settings.cycleMode);
  const [startDay, setStartDay] = useState<CycleStartDay>(settings.cycleStartDay);
  const cfg: CycleConfig = { mode, startDay };
  const current = getCycle(new Date(), cfg);
  const prev = previousCycle(current, cfg);
  const next = nextCycle(current, cfg);
  const fmt = (d: Date) => format(d, 'd MMM yyyy');
  const last = (end: Date) => new Date(end.getTime() - 1);

  const save = () => {
    updateSettings({ cycleMode: mode, cycleStartDay: startDay });
    setCycleOffset(0);
    toast('Financial cycle updated', { tone: 'ok' });
    router.back();
  };

  return (
    <Screen>
      <AppBar title="Financial cycle" back />
      <Note tone="info" icon="calendar-sync-outline">Your cycle controls monthly summaries, category budgets, reports and comparisons. Change it whenever your salary date changes.</Note>
      <Pressable onPress={() => setMode('salary')} testID="mode-salary">
        <Card style={{ borderWidth: 1.5, borderColor: mode === 'salary' ? colors.primary : colors.border }}>
          <Row gap={12} center={false}>
            <Radio on={mode === 'salary'} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">Salary-based cycle</Txt>
              <Txt v="muted" style={{ marginTop: 2 }}>Starts on the day your salary is credited and runs until the day before the next credit.</Txt>
            </View>
          </Row>
          {mode === 'salary' ? (
            <View style={{ marginTop: 14 }}>
              <Txt v="label" style={{ marginBottom: 8 }}>Cycle start day</Txt>
              <DayGrid value={startDay} onChange={setStartDay} />
              <Txt v="caption" style={{ marginTop: 8 }}>If a month is shorter than the chosen day, the cycle starts on that month&apos;s last day.</Txt>
            </View>
          ) : null}
        </Card>
      </Pressable>
      <Pressable onPress={() => setMode('calendar')} testID="mode-calendar">
        <Card style={{ borderWidth: 1.5, borderColor: mode === 'calendar' ? colors.primary : colors.border }}>
          <Row gap={12} center={false}>
            <Radio on={mode === 'calendar'} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">Calendar month</Txt>
              <Txt v="muted" style={{ marginTop: 2 }}>1st to the last day of each month.</Txt>
            </View>
          </Row>
        </Card>
      </Pressable>
      <Card>
        <Txt v="label" style={{ marginBottom: 6 }}>Preview · {describeCycleConfig(cfg)}</Txt>
        <ListItem title="Previous cycle" subtitle={`${fmt(prev.start)} → ${fmt(last(prev.end))}`} />
        <ListItem title="Current cycle" subtitle={`${fmt(current.start)} → ${fmt(last(current.end))}`} right={<Pill tone="ok" label="Active" />} />
        <ListItem title="Next cycle" subtitle={`${fmt(next.start)} → ${fmt(last(next.end))}`} last />
      </Card>
      <Note tone="warn">Cycles are computed from this setting, so past summaries and budgets are regrouped as well.</Note>
      <Button label="Save cycle settings" icon="check" onPress={save} testID="save-cycle" />
    </Screen>
  );
}
