import { format, parseISO, isValid } from 'date-fns';

/** yyyy-MM-dd in local time. */
export function dayKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Local ISO without timezone, stable across devices: yyyy-MM-dd'T'HH:mm:ss */
export function toLocalISO(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm:ss");
}

export function fromLocalISO(s: string): Date {
  const d = parseISO(s);
  return isValid(d) ? d : new Date(NaN);
}

export function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDaysLocal(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds());
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

export function isSameDayLocal(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function relativeDayLabel(d: Date, now = new Date()): string {
  const today = startOfDayLocal(now);
  const that = startOfDayLocal(d);
  const diff = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  if (that.getFullYear() === today.getFullYear()) return format(d, 'EEE, d MMM');
  return format(d, 'd MMM yyyy');
}

export function formatTime(d: Date): string {
  return format(d, 'h:mm a');
}

export function formatDateShort(d: Date): string {
  return format(d, 'd MMM');
}

export function formatDateLong(d: Date): string {
  return format(d, 'EEEE, d MMMM yyyy');
}
