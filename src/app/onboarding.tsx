import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { ACCOUNT_PRESETS } from '@/domain/defaults';
import { cycleStartInMonth, describeCycleConfig, getCycle, type CycleConfig } from '@/domain/cycle';
import type { AccountType, CycleStartDay } from '@/domain/types';
import { Button, Card, Radio, Row, Screen } from '@/components/ui/Primitives';
import { Icon, TileIcon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { Txt } from '@/components/ui/Txt';
import { Hero } from '@/components/Hero';
import { DayGrid } from '@/components/DayGrid';
import { parseAmount } from '@/domain/money';
import { format } from 'date-fns';

const features = [
  { icon: 'wallet-outline', title: 'All your accounts in one place', body: 'Bank, cash, UPI, credit cards and anything custom, with transfers that never count as spending.' },
  { icon: 'calendar-sync-outline', title: 'Tracks your real salary cycle', body: 'Budgets and reports follow your pay day, not the 1st of the month.' },
  { icon: 'chart-donut', title: 'Budgets that warn you early', body: 'Category budgets with alerts at 80% and 100%, plus insights on where your money goes.' },
  { icon: 'bell-badge-outline', title: 'Gentle daily reminders', body: 'A nudge each evening only if nothing was logged. Tap “No spending today” and it stays quiet.' },
];

export default function Onboarding() {
  const { colors } = useTheme();
  const updateSettings = useStore((s) => s.updateSettings);
  const addAccount = useStore((s) => s.addAccount);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'salary' | 'calendar'>('salary');
  const [startDay, setStartDay] = useState<CycleStartDay>('last');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [accName, setAccName] = useState('');
  const [opening, setOpening] = useState('');

  const cfg: CycleConfig = { mode, startDay };
  const current = getCycle(new Date(), cfg);
  const preset = ACCOUNT_PRESETS.find((p) => p.type === accType)!;

  const finish = () => {
    const name = accName.trim() || preset.label;
    addAccount({ name, type: accType, openingBalance: parseAmount(opening), color: preset.color, icon: preset.icon });
    updateSettings({ onboarded: true, cycleMode: mode, cycleStartDay: startDay });
    router.replace('/(tabs)');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Row gap={6} style={{ marginTop: 10, marginBottom: 22 }}>
        {[0, 1, 2].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.primary : colors.border }} />)}
      </Row>

      {step === 0 && (
        <View>
          <Hero tone="blue" style={{ paddingVertical: 28 }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Icon name="currency-inr" size={30} color="#fff" />
            </View>
            <Txt v="display" color="#fff">Money, on your terms.</Txt>
            <Txt v="body" color="rgba(255,255,255,0.8)" style={{ marginTop: 8 }}>A personal finance manager built around how you actually get paid.</Txt>
          </Hero>
          {features.map((f) => (
            <Row key={f.title} gap={14} center={false} style={{ marginBottom: 18 }}>
              <TileIcon name={f.icon} color={colors.primary} soft size={44} />
              <View style={{ flex: 1 }}>
                <Txt v="h3">{f.title}</Txt>
                <Txt v="small" color={colors.ink2} style={{ marginTop: 2 }}>{f.body}</Txt>
              </View>
            </Row>
          ))}
          <Button label="Get started" icon="arrow-right" onPress={() => setStep(1)} style={{ marginTop: 8 }} testID="ob-next-0" />
        </View>
      )}

      {step === 1 && (
        <View>
          <Txt v="h1">When does your salary arrive?</Txt>
          <Txt v="body" color={colors.ink2} style={{ marginTop: 6, marginBottom: 18 }}>Your financial month will start on that day. You can change it any time.</Txt>
          <Pressable onPress={() => setMode('salary')}>
            <Card flat={mode !== 'salary'} style={{ borderColor: mode === 'salary' ? colors.primary : colors.border, borderWidth: 1.5 }}>
              <Row gap={12} center={false}>
                <Radio on={mode === 'salary'} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3">Salary-based cycle</Txt>
                  <Txt v="muted" style={{ marginTop: 2 }}>Starts on your pay day and runs until the day before the next one.</Txt>
                </View>
              </Row>
              {mode === 'salary' && (
                <View style={{ marginTop: 14 }}>
                  <Txt v="label" style={{ marginBottom: 8 }}>Pay day</Txt>
                  <DayGrid value={startDay} onChange={setStartDay} />
                </View>
              )}
            </Card>
          </Pressable>
          <Pressable onPress={() => setMode('calendar')}>
            <Card flat={mode !== 'calendar'} style={{ borderColor: mode === 'calendar' ? colors.primary : colors.border, borderWidth: 1.5 }}>
              <Row gap={12} center={false}>
                <Radio on={mode === 'calendar'} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3">Calendar month</Txt>
                  <Txt v="muted" style={{ marginTop: 2 }}>1st to the last day of each month.</Txt>
                </View>
              </Row>
            </Card>
          </Pressable>
          <Card flat>
            <Txt v="label" style={{ marginBottom: 6 }}>Preview</Txt>
            <Txt v="bodyStrong">{describeCycleConfig(cfg)}</Txt>
            <Txt v="muted" style={{ marginTop: 4 }}>Current cycle: {current.label} · next starts {format(cycleStartInMonth(current.start.getFullYear(), current.start.getMonth() + 1, cfg), 'd MMM')}</Txt>
          </Card>
          <Row gap={10}>
            <Button label="Back" variant="ghost" onPress={() => setStep(0)} style={{ flex: 1 }} />
            <Button label="Continue" onPress={() => setStep(2)} style={{ flex: 2 }} testID="ob-next-1" />
          </Row>
        </View>
      )}

      {step === 2 && (
        <View>
          <Txt v="h1">Add your first account</Txt>
          <Txt v="body" color={colors.ink2} style={{ marginTop: 6, marginBottom: 18 }}>Where does your money live? You can add more later.</Txt>
          <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 14 }}>
            {ACCOUNT_PRESETS.map((p) => (
              <Pressable key={p.type} onPress={() => setAccType(p.type)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: accType === p.type ? colors.primary : colors.border, backgroundColor: accType === p.type ? colors.primarySoft : colors.surface }}>
                <TileIcon name={p.icon} color={p.color} size={26} />
                <Txt v="small" style={{ fontWeight: '700' }}>{p.label}</Txt>
              </Pressable>
            ))}
          </Row>
          <TextField label="Account name" placeholder={preset.label === 'Bank account' ? 'e.g. HDFC Savings' : preset.label} value={accName} onChangeText={setAccName} icon="tag-outline" testID="ob-account-name" />
          <TextField label={accType === 'credit' ? 'Current outstanding (optional)' : 'Current balance'} placeholder="0" keyboardType="decimal-pad" value={opening} onChangeText={setOpening} icon="cash" />
          <Row gap={10} style={{ marginTop: 8 }}>
            <Button label="Back" variant="ghost" onPress={() => setStep(1)} style={{ flex: 1 }} />
            <Button label="Finish setup" icon="check" onPress={finish} style={{ flex: 2 }} testID="ob-finish" />
          </Row>
        </View>
      )}
    </Screen>
  );
}
