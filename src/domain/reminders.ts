import { dayKey, startOfDayLocal } from './dates';
import type { ReminderSettings, ReminderState } from './types';

export interface ReminderContext {
  now: Date;
  settings: ReminderSettings;
  state: ReminderState;
  hasExpenseToday: boolean;
}

export function reminderTimeOn(day: Date, settings: ReminderSettings): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), settings.hour, settings.minute, 0, 0);
}

/** True if today's reminder has been resolved: an expense was added or "no spending" was confirmed. */
export function isResolvedToday(ctx: ReminderContext): boolean {
  const key = dayKey(ctx.now);
  return ctx.hasExpenseToday || ctx.state.noSpendDays.includes(key);
}

/**
 * Whether an in-app prompt should be shown right now (used on web and as a fallback when the
 * OS notification was missed). Fires once per day, after the reminder time (or snooze time).
 */
export function shouldPromptNow(ctx: ReminderContext): boolean {
  if (!ctx.settings.enabled) return false;
  if (isResolvedToday(ctx)) return false;
  const key = dayKey(ctx.now);
  if (ctx.state.lastPromptDate === key && !ctx.state.snoozeUntil) return false;
  if (ctx.state.snoozeUntil) {
    const until = new Date(ctx.state.snoozeUntil);
    if (dayKey(until) !== key) return false; // stale snooze from another day
    return ctx.now >= until;
  }
  return ctx.now >= reminderTimeOn(ctx.now, ctx.settings);
}

/**
 * The next OS notification times to schedule. Returns up to `horizonDays` dates: today's slot if still
 * pending and not resolved, then one for each following day at the configured time.
 */
export function nextReminderDates(ctx: ReminderContext, horizonDays = 7): Date[] {
  if (!ctx.settings.enabled) return [];
  const out: Date[] = [];
  const today = startOfDayLocal(ctx.now);
  if (!isResolvedToday(ctx)) {
    const snooze = ctx.state.snoozeUntil ? new Date(ctx.state.snoozeUntil) : null;
    const todaySlot = snooze && dayKey(snooze) === dayKey(ctx.now) ? snooze : reminderTimeOn(today, ctx.settings);
    if (todaySlot > ctx.now) out.push(todaySlot);
  }
  for (let i = 1; out.length < horizonDays && i <= horizonDays; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    out.push(reminderTimeOn(d, ctx.settings));
  }
  return out;
}

export interface SnoozeOption {
  label: string;
  at: Date;
  disabled: boolean;
}

/** Same-day snooze slots: a few quick offsets plus half-hour slots up to the quiet hour. */
export function snoozeOptions(now: Date, settings: ReminderSettings): SnoozeOption[] {
  const endOfWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), settings.quietFromHour, 0, 0, 0);
  const opts: SnoozeOption[] = [];
  const push = (label: string, at: Date) => opts.push({ label, at, disabled: at <= now || at > endOfWindow || dayKey(at) !== dayKey(now) });
  push('In 30 min', new Date(now.getTime() + 30 * 60000));
  push('In 1 hour', new Date(now.getTime() + 60 * 60000));
  push('In 2 hours', new Date(now.getTime() + 120 * 60000));
  // Next half-hour slots
  const slot = new Date(now);
  slot.setSeconds(0, 0);
  slot.setMinutes(slot.getMinutes() < 30 ? 30 : 60);
  for (let i = 0; i < 6; i++) {
    const at = new Date(slot.getTime() + i * 30 * 60000);
    if (at.getDate() !== now.getDate()) break;
    const label = at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    push(label, at);
  }
  return opts;
}

/** Marks today as a no-spend day and clears any snooze. */
export function markNoSpend(state: ReminderState, now: Date): ReminderState {
  const key = dayKey(now);
  return { ...state, noSpendDays: state.noSpendDays.includes(key) ? state.noSpendDays : [...state.noSpendDays, key], snoozeUntil: null, lastPromptDate: key };
}

export function snooze(state: ReminderState, at: Date): ReminderState {
  return { ...state, snoozeUntil: at.toISOString(), lastPromptDate: dayKey(at) };
}

export function markPrompted(state: ReminderState, now: Date): ReminderState {
  return { ...state, lastPromptDate: dayKey(now), snoozeUntil: null };
}

/** Drops stale no-spend days (older than 400 days) and expired snoozes. */
export function pruneReminderState(state: ReminderState, now: Date): ReminderState {
  const cutoff = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 400));
  const noSpendDays = state.noSpendDays.filter((k) => k >= cutoff);
  const snoozeUntil = state.snoozeUntil && dayKey(new Date(state.snoozeUntil)) === dayKey(now) ? state.snoozeUntil : null;
  return { ...state, noSpendDays, snoozeUntil };
}
