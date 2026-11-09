import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { hasExpenseOnDay } from '@/domain/analytics';
import { dayKey } from '@/domain/dates';
import { nextReminderDates, type ReminderContext } from '@/domain/reminders';
import { useStore } from '@/store/useStore';

export const REMINDER_CATEGORY = 'dailyreminder';
export const CHANNEL_REMINDERS = 'reminders';
export const CHANNEL_BUDGETS = 'budgets';
export const ACTION_ADD = 'add';
export const ACTION_NO_SPEND = 'nospend';
export const ACTION_LATER = 'later';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
/** Expo Go lacks some native notification modules (e.g. Android channels); a dev/production build has them all. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
/** Custom channels are only available outside Expo Go. */
const channelsSupported = isNative && Platform.OS === 'android' && !isExpoGo;
let initialised = false;

function warn(step: string, e: unknown): void {
  console.warn(`[notifications] ${step} failed: ${(e as Error)?.message ?? e}`);
}

export async function initNotifications(): Promise<void> {
  if (!isNative || initialised) return;
  initialised = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
    });
  } catch (e) {
    warn('setNotificationHandler', e);
  }
  if (channelsSupported) {
    try {
      // AndroidImportance is a re-exported enum; the import plugin cannot see it through `export *`.
      // eslint-disable-next-line import/namespace
      const importance = Notifications.AndroidImportance.HIGH;
      await Notifications.setNotificationChannelAsync(CHANNEL_REMINDERS, { name: 'Daily expense reminders', importance, vibrationPattern: [0, 250, 250, 250], lightColor: '#2563eb' });
      await Notifications.setNotificationChannelAsync(CHANNEL_BUDGETS, { name: 'Budget alerts', importance, lightColor: '#e03e3e' });
    } catch (e) {
      warn('setNotificationChannelAsync', e);
    }
  }
  try {
    await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
      { identifier: ACTION_ADD, buttonTitle: 'Add expense', options: { opensAppToForeground: true } },
      { identifier: ACTION_NO_SPEND, buttonTitle: 'No spending today', options: { opensAppToForeground: false } },
      { identifier: ACTION_LATER, buttonTitle: 'Remind me later', options: { opensAppToForeground: true } },
    ]);
  } catch (e) {
    warn('setNotificationCategoryAsync', e);
  }
}

/** Channel fields are only attached when custom channels exist; otherwise the default channel is used. */
function channel(id: string): { channelId?: string } {
  return channelsSupported ? { channelId: id } : {};
}

export async function ensurePermission(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch (e) {
    warn('permissions', e);
    return false;
  }
}

export function buildReminderContext(now = new Date()): ReminderContext {
  const s = useStore.getState();
  return { now, settings: s.settings.reminder, state: s.reminder, hasExpenseToday: hasExpenseOnDay(s.transactions, dayKey(now)) };
}

/**
 * Re-plans the OS reminders: cancels every pending reminder and schedules one-shot notifications for
 * the next few days, skipping today when it is already resolved (expense added / no-spend confirmed).
 */
export async function syncReminderSchedule(now = new Date()): Promise<number> {
  if (!isNative) return 0;
  try {
    await initNotifications();
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(pending.filter((p) => p.content.data?.kind === 'reminder').map((p) => Notifications.cancelScheduledNotificationAsync(p.identifier)));
    const ctx = buildReminderContext(now);
    const dates = nextReminderDates(ctx, 7);
    if (dates.length === 0) return 0;
    if (!(await ensurePermission())) return 0;
    for (const date of dates) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Did you spend anything today?',
          body: 'No expenses recorded yet. Take 10 seconds to keep your cycle accurate.',
          categoryIdentifier: REMINDER_CATEGORY,
          data: { kind: 'reminder', day: dayKey(date) },
          sound: true,
          ...channel(CHANNEL_REMINDERS),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, ...channel(CHANNEL_REMINDERS) },
      });
    }
    return dates.length;
  } catch (e) {
    warn('syncReminderSchedule', e);
    return 0;
  }
}

export async function sendBudgetAlert(title: string, body: string): Promise<void> {
  if (!isNative) return;
  try {
    await initNotifications();
    if (!(await ensurePermission())) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { kind: 'budget' }, sound: true, ...channel(CHANNEL_BUDGETS) },
      trigger: null,
    });
  } catch (e) {
    warn('sendBudgetAlert', e);
  }
}

export type ReminderAction = 'add' | 'nospend' | 'later' | 'open';

/** Maps a notification response to an app-level action. Pure so it can be unit tested. */
export function classifyResponse(response: { actionIdentifier: string; notification: { request: { content: { data?: Record<string, unknown> | null } } } }): ReminderAction | null {
  const data = response.notification.request.content.data ?? {};
  if (data.kind !== 'reminder') return null;
  switch (response.actionIdentifier) {
    case ACTION_ADD: return 'add';
    case ACTION_NO_SPEND: return 'nospend';
    case ACTION_LATER: return 'later';
    default: return 'open';
  }
}

export function addResponseListener(handler: (action: ReminderAction) => void): () => void {
  if (!isNative) return () => undefined;
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const action = classifyResponse(response);
      if (action) handler(action);
    });
    return () => sub.remove();
  } catch (e) {
    warn('addNotificationResponseReceivedListener', e);
    return () => undefined;
  }
}
