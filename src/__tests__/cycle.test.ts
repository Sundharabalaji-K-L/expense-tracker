import { cycleDayInfo, cycleStartInMonth, describeCycleConfig, getCycle, nextCycle, previousCycle, recentCycles, shiftCycle, type CycleConfig } from '@/domain/cycle';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

describe('financial cycle', () => {
  const salary30: CycleConfig = { mode: 'salary', startDay: 30 };
  const last: CycleConfig = { mode: 'salary', startDay: 'last' };
  const calendar: CycleConfig = { mode: 'calendar', startDay: 1 };

  test('salary cycle starting on the 30th: Oct 30 → Nov 29 inclusive', () => {
    const c = getCycle(d(2026, 11, 9), salary30);
    expect(iso(c.start)).toBe('2026-10-30');
    expect(iso(c.end)).toBe('2026-11-30'); // exclusive
    expect(c.label).toBe('30 Oct – 29 Nov');
    expect(c.short).toBe('Nov');
  });

  test('a date before the start day belongs to the previous cycle', () => {
    expect(iso(getCycle(d(2026, 10, 29), salary30).start)).toBe('2026-09-30');
    expect(iso(getCycle(d(2026, 10, 30), salary30).start)).toBe('2026-10-30');
  });

  test('December continues the configured cycle instead of resetting on the 1st', () => {
    const c = getCycle(d(2026, 12, 1), salary30);
    expect(iso(c.start)).toBe('2026-11-30');
    expect(iso(c.end)).toBe('2026-12-30');
  });

  test('short months clamp the start day to the last day of the month', () => {
    expect(iso(cycleStartInMonth(2026, 1, salary30))).toBe('2026-02-28'); // Feb 2026 has 28 days
    expect(iso(cycleStartInMonth(2024, 1, salary30))).toBe('2024-02-29'); // leap year
    const c = getCycle(d(2026, 3, 1), salary30);
    expect(iso(c.start)).toBe('2026-02-28');
    expect(iso(c.end)).toBe('2026-03-30');
  });

  test('"last day" mode starts on the last day of the previous month', () => {
    const c = getCycle(d(2026, 11, 9), last);
    expect(iso(c.start)).toBe('2026-10-31');
    expect(iso(c.end)).toBe('2026-11-30');
    const feb = getCycle(d(2026, 2, 10), last);
    expect(iso(feb.start)).toBe('2026-01-31');
    expect(iso(feb.end)).toBe('2026-02-28');
  });

  test('calendar mode runs 1st to last day', () => {
    const c = getCycle(d(2026, 11, 9), calendar);
    expect(iso(c.start)).toBe('2026-11-01');
    expect(iso(c.end)).toBe('2026-12-01');
    expect(c.label).toBe('1 Nov – 30 Nov');
  });

  test('shifting cycles crosses year boundaries', () => {
    const c = getCycle(d(2026, 1, 15), salary30);
    expect(iso(c.start)).toBe('2025-12-30');
    expect(c.label).toBe('30 Dec 25 – 29 Jan 26');
    expect(iso(previousCycle(c, salary30).start)).toBe('2025-11-30');
    expect(iso(nextCycle(c, salary30).start)).toBe('2026-01-30');
    expect(iso(shiftCycle(c, -12, salary30).start)).toBe('2024-12-30');
  });

  test('cycles never overlap and never leave gaps', () => {
    for (const cfg of [salary30, last, calendar, { mode: 'salary', startDay: 31 } as CycleConfig, { mode: 'salary', startDay: 1 } as CycleConfig]) {
      let c = getCycle(d(2025, 1, 1), cfg);
      for (let i = 0; i < 30; i++) {
        const n = nextCycle(c, cfg);
        expect(n.start.getTime()).toBe(c.end.getTime());
        expect(n.end > n.start).toBe(true);
        c = n;
      }
    }
  });

  test('every day maps to exactly one cycle', () => {
    for (const cfg of [salary30, last, { mode: 'salary', startDay: 31 } as CycleConfig]) {
      for (let day = new Date(2025, 0, 1); day < new Date(2027, 0, 1); day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
        const c = getCycle(day, cfg);
        expect(day >= c.start && day < c.end).toBe(true);
      }
    }
  });

  test('recentCycles returns oldest first ending at the current cycle', () => {
    const list = recentCycles(d(2026, 11, 9), 4, salary30);
    expect(list.map((c) => iso(c.start))).toEqual(['2026-07-30', '2026-08-30', '2026-09-30', '2026-10-30']);
  });

  test('cycleDayInfo counts days into the cycle', () => {
    const c = getCycle(d(2026, 11, 9), salary30);
    expect(cycleDayInfo(c, d(2026, 11, 9))).toEqual({ dayIndex: 11, totalDays: 31, daysLeft: 20 });
    expect(cycleDayInfo(c, d(2026, 10, 30)).dayIndex).toBe(1);
  });

  test('describeCycleConfig', () => {
    expect(describeCycleConfig(calendar)).toMatch(/Calendar month/);
    expect(describeCycleConfig(last)).toMatch(/last day/);
    expect(describeCycleConfig(salary30)).toMatch(/30th/);
    expect(describeCycleConfig({ mode: 'salary', startDay: 1 })).toMatch(/1st/);
    expect(describeCycleConfig({ mode: 'salary', startDay: 22 })).toMatch(/22nd/);
  });
});
