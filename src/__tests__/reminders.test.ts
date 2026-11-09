import { isResolvedToday, markNoSpend, markPrompted, nextReminderDates, pruneReminderState, reminderTimeOn, shouldPromptNow, snooze, snoozeOptions, type ReminderContext } from '@/domain/reminders';
import { classifyResponse } from '@/services/notifications';
import { DEFAULT_REMINDER_STATE, type ReminderSettings } from '@/domain/types';

const settings: ReminderSettings = { enabled: true, hour: 20, minute: 30, quietFromHour: 23 };
const at = (h: number, m = 0) => new Date(2026, 10, 9, h, m);
const ctx = (over: Partial<ReminderContext> = {}): ReminderContext => ({ now: at(21), settings, state: DEFAULT_REMINDER_STATE, hasExpenseToday: false, ...over });

describe('daily reminder rules', () => {
  test('prompts after the reminder time when nothing is logged', () => {
    expect(shouldPromptNow(ctx({ now: at(20, 29) }))).toBe(false);
    expect(shouldPromptNow(ctx({ now: at(20, 30) }))).toBe(true);
    expect(shouldPromptNow(ctx({ now: at(23, 59) }))).toBe(true);
  });

  test('adding an expense stops reminders for the day', () => {
    expect(shouldPromptNow(ctx({ hasExpenseToday: true }))).toBe(false);
    expect(nextReminderDates(ctx({ now: at(19), hasExpenseToday: true }))[0].getDate()).toBe(10);
  });

  test('"No spending today" stops reminders for the day only', () => {
    const state = markNoSpend(DEFAULT_REMINDER_STATE, at(21));
    expect(state.noSpendDays).toEqual(['2026-11-09']);
    expect(isResolvedToday(ctx({ state }))).toBe(true);
    expect(shouldPromptNow(ctx({ state }))).toBe(false);
    // Next day it resets automatically
    const tomorrow = new Date(2026, 10, 10, 21);
    expect(shouldPromptNow(ctx({ state, now: tomorrow }))).toBe(true);
  });

  test('prompting is once per day unless snoozed', () => {
    const prompted = markPrompted(DEFAULT_REMINDER_STATE, at(21));
    expect(shouldPromptNow(ctx({ state: prompted, now: at(22) }))).toBe(false);
    const snoozed = snooze(prompted, at(22));
    expect(shouldPromptNow(ctx({ state: snoozed, now: at(21, 30) }))).toBe(false);
    expect(shouldPromptNow(ctx({ state: snoozed, now: at(22) }))).toBe(true);
  });

  test('a stale snooze from another day is ignored', () => {
    const snoozed = snooze(DEFAULT_REMINDER_STATE, new Date(2026, 10, 8, 22));
    expect(shouldPromptNow(ctx({ state: snoozed, now: at(23) }))).toBe(false);
    expect(pruneReminderState(snoozed, at(9)).snoozeUntil).toBeNull();
  });

  test('disabled reminders never prompt or schedule', () => {
    const off = { ...settings, enabled: false };
    expect(shouldPromptNow(ctx({ settings: off }))).toBe(false);
    expect(nextReminderDates(ctx({ settings: off }))).toEqual([]);
  });

  test('nextReminderDates: today if still pending, then following days', () => {
    const dates = nextReminderDates(ctx({ now: at(18) }), 3);
    expect(dates).toHaveLength(3);
    expect(dates[0]).toEqual(at(20, 30));
    expect(dates[1]).toEqual(new Date(2026, 10, 10, 20, 30));
    // After the reminder time today, today's slot is skipped
    const later = nextReminderDates(ctx({ now: at(21) }), 3);
    expect(later[0]).toEqual(new Date(2026, 10, 10, 20, 30));
    // A snooze replaces today's slot
    const snoozed = nextReminderDates(ctx({ now: at(21), state: snooze(DEFAULT_REMINDER_STATE, at(22)) }), 2);
    expect(snoozed[0]).toEqual(at(22));
  });

  test('snooze options stay within the same day and before quiet hours', () => {
    const opts = snoozeOptions(at(21, 10), settings);
    const enabled = opts.filter((o) => !o.disabled);
    expect(enabled.length).toBeGreaterThan(0);
    for (const o of enabled) {
      expect(o.at.getDate()).toBe(9);
      expect(o.at.getTime()).toBeLessThanOrEqual(at(23).getTime());
    }
    expect(opts.find((o) => o.label === 'In 2 hours')?.disabled).toBe(true); // 23:10 is past quiet hour
    const late = snoozeOptions(at(23, 30), settings);
    expect(late.every((o) => o.disabled)).toBe(true);
  });

  test('reminderTimeOn and prune', () => {
    expect(reminderTimeOn(at(3), settings)).toEqual(at(20, 30));
    const old = { ...DEFAULT_REMINDER_STATE, noSpendDays: ['2024-01-01', '2026-11-01'] };
    expect(pruneReminderState(old, at(9)).noSpendDays).toEqual(['2026-11-01']);
  });

  test('notification responses map to app actions', () => {
    const resp = (actionIdentifier: string, kind = 'reminder') => ({ actionIdentifier, notification: { request: { content: { data: { kind } } } } });
    expect(classifyResponse(resp('add'))).toBe('add');
    expect(classifyResponse(resp('nospend'))).toBe('nospend');
    expect(classifyResponse(resp('later'))).toBe('later');
    expect(classifyResponse(resp('expo.modules.notifications.actions.DEFAULT'))).toBe('open');
    expect(classifyResponse(resp('add', 'budget'))).toBeNull();
  });
});
