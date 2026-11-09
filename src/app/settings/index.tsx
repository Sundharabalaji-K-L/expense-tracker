import React, { useState } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { describeCycleConfig, cycleConfigFromSettings } from '@/domain/cycle';
import { useAuth } from '@/store/useAuth';
import { signOut } from '@/services/auth';
import { useToast } from '@/components/ui/Toast';
import { AppBar, Card, ListItem, Pill, Radio, Screen, Segmented } from '@/components/ui/Primitives';
import { ConfirmDialog, Sheet } from '@/components/ui/Sheet';
import { TileIcon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';

const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee (₹)' },
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SGD', name: 'Singapore Dollar (S$)' },
];

export default function Settings() {
  const { colors } = useTheme();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const [curOpen, setCurOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const user = useAuth((s) => s.user);
  const syncStatus = useAuth((s) => s.syncStatus);
  const lastSyncedAt = useAuth((s) => s.lastSyncedAt);
  const toast = useToast();
  const syncLabel = syncStatus === 'error' ? 'Sync paused. Changes are saved on this phone and will sync automatically.' : syncStatus === 'offline' ? 'Offline · changes will sync when back online' : lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Connecting…';
  const syncTone = syncStatus === 'synced' ? 'ok' : syncStatus === 'error' ? 'over' : syncStatus === 'offline' ? 'warn' : 'info';
  const syncPill = syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing' : syncStatus === 'offline' ? 'Offline' : syncStatus === 'error' ? 'Error' : 'Idle';
  const syncIcon = syncStatus === 'synced' ? 'cloud-check-outline' : syncStatus === 'error' ? 'cloud-alert' : syncStatus === 'offline' ? 'cloud-off-outline' : 'cloud-sync-outline';

  return (
    <Screen>
      <AppBar title="Settings" back large />
      <Txt v="label" style={{ marginBottom: 8 }}>Account & sync</Txt>
      <Card style={{ paddingVertical: 4 }}>
        <ListItem left={<TileIcon name="account-circle-outline" color={colors.primary} soft size={36} />} title={user?.email ?? 'Signed in'} subtitle={syncLabel} right={<Pill tone={syncTone} label={syncPill} icon={syncIcon} />} />
        <ListItem left={<TileIcon name="logout" color={colors.expense} soft size={36} />} title="Sign out" subtitle="Your data stays in the cloud; the local copy is cleared" onPress={() => setConfirmOut(true)} testID="sign-out" last />
      </Card>

      <Txt v="label" style={{ marginBottom: 8 }}>General</Txt>
      <Card style={{ paddingVertical: 4 }}>
        <ListItem left={<TileIcon name="calendar-sync-outline" color={colors.primary} soft size={36} />} title="Financial cycle" subtitle={describeCycleConfig(cycleConfigFromSettings(settings))} chevron onPress={() => router.push('/settings/cycle')} testID="settings-cycle" />
        <ListItem left={<TileIcon name="wallet-outline" color="#0f9d58" soft size={36} />} title="Accounts" subtitle={`${accounts.filter((a) => !a.archived).length} accounts`} chevron onPress={() => router.push('/accounts')} />
        <ListItem left={<TileIcon name="shape-outline" color="#eb6834" soft size={36} />} title="Categories" subtitle={`${categories.filter((c) => c.kind === 'expense' && !c.archived).length} expense · ${categories.filter((c) => c.kind === 'income' && !c.archived).length} income`} chevron onPress={() => router.push('/categories')} testID="settings-categories" />
        <ListItem left={<TileIcon name="currency-inr" color="#6f5bd6" soft size={36} />} title="Currency" subtitle={CURRENCIES.find((c) => c.code === settings.currency)?.name ?? settings.currency} chevron onPress={() => setCurOpen(true)} last />
      </Card>

      <Txt v="label" style={{ marginBottom: 8 }}>Appearance</Txt>
      <Card>
        <Segmented options={[{ value: 'light', label: 'Light', icon: 'white-balance-sunny' }, { value: 'dark', label: 'Dark', icon: 'weather-night' }, { value: 'system', label: 'System', icon: 'cellphone' }]} value={settings.theme} onChange={(theme) => updateSettings({ theme })} />
        <Txt v="muted" style={{ marginTop: -6 }}>System follows your device&apos;s light/dark setting.</Txt>
      </Card>

      <Txt v="label" style={{ marginBottom: 8 }}>Notifications</Txt>
      <Card style={{ paddingVertical: 4 }}>
        <ListItem left={<TileIcon name="bell-ring-outline" color="#f59e0b" soft size={36} />} title="Daily reminder & budget alerts" subtitle={settings.reminder.enabled ? `Reminder at ${String(settings.reminder.hour % 12 || 12)}:${String(settings.reminder.minute).padStart(2, '0')} ${settings.reminder.hour >= 12 ? 'PM' : 'AM'}` : 'Reminder off'} chevron onPress={() => router.push('/settings/notifications')} testID="settings-notifications" last />
      </Card>

      <Txt v="label" style={{ marginBottom: 8 }}>Data</Txt>
      <Card style={{ paddingVertical: 4 }}>
        <ListItem left={<TileIcon name="database-export-outline" color="#2a78d6" soft size={36} />} title="Export & backup" subtitle="CSV, PDF and a downloadable copy of your data" chevron onPress={() => router.push('/settings/data')} testID="settings-data" last />
      </Card>

      <Txt v="caption" center style={{ marginTop: 10, color: colors.ink4 }}>Expense Tracker · all data stays on this device</Txt>

      <ConfirmDialog visible={confirmOut} onClose={() => setConfirmOut(false)} title="Sign out?" body="Your data is safe in the cloud and will load again when you sign in. The copy on this phone is removed." confirmLabel="Sign out" icon="logout" onConfirm={async () => { setConfirmOut(false); try { await signOut(); } catch { toast('Could not sign out. Please try again.', { tone: 'danger' }); } }} />
      <Sheet visible={curOpen} onClose={() => setCurOpen(false)} title="Currency">
        {CURRENCIES.map((c, i) => <ListItem key={c.code} left={<Radio on={settings.currency === c.code} />} title={c.name} subtitle={c.code} onPress={() => { updateSettings({ currency: c.code }); setCurOpen(false); }} last={i === CURRENCIES.length - 1} />)}
      </Sheet>
    </Screen>
  );
}
