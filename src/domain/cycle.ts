import { format } from 'date-fns';
import { daysInMonth, startOfDayLocal } from './dates';
import type { CycleMode, CycleStartDay, DateRange, Settings } from './types';

export interface Cycle extends DateRange {
  /** Stable key, e.g. 2026-10-31 (the start day). */
  key: string;
  /** Human label, e.g. "31 Oct – 29 Nov". */
  label: string;
  /** Short label for charts, e.g. "Nov". */
  short: string;
}

export interface CycleConfig {
  mode: CycleMode;
  startDay: CycleStartDay;
}

export function cycleConfigFromSettings(s: Pick<Settings, 'cycleMode' | 'cycleStartDay'>): CycleConfig {
  return { mode: s.cycleMode, startDay: s.cycleStartDay };
}

/** Start date of the cycle that begins in the given month (year, month0). */
export function cycleStartInMonth(year: number, month0: number, cfg: CycleConfig): Date {
  if (cfg.mode === 'calendar') return new Date(year, month0, 1);
  const dim = daysInMonth(year, month0);
  const day = cfg.startDay === 'last' ? dim : Math.min(Math.max(1, Math.floor(cfg.startDay)), dim);
  return new Date(year, month0, day);
}

function build(start: Date, end: Date): Cycle {
  const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
  const sameYear = start.getFullYear() === lastDay.getFullYear();
  const label = sameYear
    ? `${format(start, 'd MMM')} – ${format(lastDay, 'd MMM')}`
    : `${format(start, 'd MMM yy')} – ${format(lastDay, 'd MMM yy')}`;
  // Name the cycle after the month that holds most of its days (the month containing the end).
  const short = format(lastDay, 'MMM');
  return { start, end, key: format(start, 'yyyy-MM-dd'), label, short };
}

/** The cycle containing `date`. `end` is exclusive. */
export function getCycle(date: Date, cfg: CycleConfig): Cycle {
  const d = startOfDayLocal(date);
  let start = cycleStartInMonth(d.getFullYear(), d.getMonth(), cfg);
  if (d < start) {
    start = cycleStartInMonth(d.getFullYear(), d.getMonth() - 1, cfg);
  }
  const end = cycleStartInMonth(start.getFullYear(), start.getMonth() + 1, cfg);
  return build(start, end);
}

/** Shift a cycle by n (negative = earlier). */
export function shiftCycle(cycle: Cycle, n: number, cfg: CycleConfig): Cycle {
  const start = cycleStartInMonth(cycle.start.getFullYear(), cycle.start.getMonth() + n, cfg);
  const end = cycleStartInMonth(start.getFullYear(), start.getMonth() + 1, cfg);
  return build(start, end);
}

export function previousCycle(cycle: Cycle, cfg: CycleConfig): Cycle {
  return shiftCycle(cycle, -1, cfg);
}

export function nextCycle(cycle: Cycle, cfg: CycleConfig): Cycle {
  return shiftCycle(cycle, 1, cfg);
}

/** Last `count` cycles ending with the one containing `date`, oldest first. */
export function recentCycles(date: Date, count: number, cfg: CycleConfig): Cycle[] {
  const current = getCycle(date, cfg);
  const out: Cycle[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(shiftCycle(current, -i, cfg));
  return out;
}

export function inRange(date: Date, range: DateRange): boolean {
  return date >= range.start && date < range.end;
}

export function cycleDayInfo(cycle: Cycle, now: Date): { dayIndex: number; totalDays: number; daysLeft: number } {
  const totalDays = Math.round((cycle.end.getTime() - cycle.start.getTime()) / 86400000);
  const today = startOfDayLocal(now);
  const dayIndex = Math.min(totalDays, Math.max(1, Math.floor((today.getTime() - cycle.start.getTime()) / 86400000) + 1));
  return { dayIndex, totalDays, daysLeft: Math.max(0, totalDays - dayIndex) };
}

export function describeCycleConfig(cfg: CycleConfig): string {
  if (cfg.mode === 'calendar') return 'Calendar month (1st to last day)';
  if (cfg.startDay === 'last') return 'Salary cycle · starts on the last day of the month';
  return `Salary cycle · starts on the ${ordinal(cfg.startDay)}`;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
