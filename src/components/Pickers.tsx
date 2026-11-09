import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore, useUiStore } from '@/store/useStore';
import { usePeriod } from '@/store/selectors';
import { cycleConfigFromSettings, getCycle, shiftCycle } from '@/domain/cycle';
import { daysInMonth, isSameDayLocal, startOfDayLocal } from '@/domain/dates';
import type { Account, Category } from '@/domain/types';
import { Button, Chip, ListItem, Radio, Row } from './ui/Primitives';
import { Sheet } from './ui/Sheet';
import { Icon, TileIcon } from './ui/Icon';
import { Txt } from './ui/Txt';

/* ------------------------------------------------------------------ */
/* Period (financial cycle / custom range) picker                      */
/* ------------------------------------------------------------------ */

export function PeriodChip() {
  const [open, setOpen] = useState(false);
  const period = usePeriod();
  return (
    <>
      <Chip icon="calendar-month-outline" label={period.isCurrent ? period.label : period.isCustom ? period.label : `${period.label}`} tone="primary" trailingIcon="chevron-down" onPress={() => setOpen(true)} />
      <PeriodSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function PeriodSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const settings = useStore((s) => s.settings);
  const { cycleOffset, customRange, setCycleOffset, setCustomRange } = useUiStore();
  const [customOpen, setCustomOpen] = useState(false);
  const cfg = cycleConfigFromSettings(settings);
  const current = getCycle(new Date(), cfg);
  const options = useMemo(() => [0, -1, -2, -3, -4, -5].map((off) => ({ off, cycle: off === 0 ? current : shiftCycle(current, off, cfg) })), [current.key, cfg.mode, cfg.startDay]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Sheet visible={visible} onClose={onClose} title="Select period" subtitle={settings.cycleMode === 'calendar' ? 'Calendar months' : 'Your salary cycles'}>
        {options.map(({ off, cycle }, i) => (
          <ListItem
            key={cycle.key}
            left={<Radio on={!customRange && cycleOffset === off} />}
            title={off === 0 ? `Current cycle · ${cycle.label}` : off === -1 ? `Previous cycle · ${cycle.label}` : cycle.label}
            subtitle={`${format(cycle.start, 'd MMM yyyy')} → ${format(new Date(cycle.end.getTime() - 1), 'd MMM yyyy')}`}
            onPress={() => { setCycleOffset(off); onClose(); }}
            last={i === options.length - 1}
          />
        ))}
        <View style={{ height: 10 }} />
        <Button label={customRange ? 'Change custom range' : 'Custom date range'} variant="secondary" icon="calendar-range" onPress={() => setCustomOpen(true)} />
        {customRange ? <Button label="Clear custom range" variant="ghost" style={{ marginTop: 8 }} onPress={() => { setCustomRange(null); onClose(); }} /> : null}
        <View style={{ height: 6 }} />
        <Txt v="caption" center color={colors.ink3}>Change the cycle start day in Settings → Financial cycle</Txt>
      </Sheet>
      <DateRangeSheet
        visible={customOpen}
        onClose={() => setCustomOpen(false)}
        initial={customRange ? { start: new Date(customRange.start), end: new Date(new Date(customRange.end).getTime() - 1) } : undefined}
        onApply={(start, endInclusive) => {
          const end = new Date(endInclusive.getFullYear(), endInclusive.getMonth(), endInclusive.getDate() + 1);
          setCustomRange({ start: start.toISOString(), end: end.toISOString() });
          setCustomOpen(false);
          onClose();
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

export function Calendar({ month, onMonthChange, selected, rangeStart, rangeEnd, onSelect, markedDays, maxDate }: { month: Date; onMonthChange: (d: Date) => void; selected?: Date; rangeStart?: Date; rangeEnd?: Date; onSelect: (d: Date) => void; markedDays?: Set<string>; maxDate?: Date }) {
  const { colors } = useTheme();
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const dim = daysInMonth(y, m);
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => new Date(y, m, i + 1))];
  while (cells.length % 7 !== 0) cells.push(null);
  const inRange = (d: Date) => rangeStart && rangeEnd && d >= startOfDayLocal(rangeStart) && d <= startOfDayLocal(rangeEnd);
  return (
    <View>
      <Row between style={{ marginBottom: 10 }}>
        <Pressable onPress={() => onMonthChange(new Date(y, m - 1, 1))} hitSlop={8}><Icon name="chevron-left" size={24} /></Pressable>
        <Txt v="h3">{format(month, 'MMMM yyyy')}</Txt>
        <Pressable onPress={() => onMonthChange(new Date(y, m + 1, 1))} hitSlop={8}><Icon name="chevron-right" size={24} /></Pressable>
      </Row>
      <View style={{ flexDirection: 'row' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Txt key={i} v="caption" center style={{ flex: 1, fontWeight: '700' }}>{d}</Txt>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: `${100 / 7}%`, height: 40 }} />;
          const isSel = (selected && isSameDayLocal(d, selected)) || (rangeStart && isSameDayLocal(d, rangeStart)) || (rangeEnd && isSameDayLocal(d, rangeEnd));
          const mid = !isSel && inRange(d);
          const disabled = maxDate ? d > maxDate : false;
          const marked = markedDays?.has(format(d, 'yyyy-MM-dd'));
          return (
            <Pressable key={i} disabled={disabled} onPress={() => onSelect(d)} style={{ width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isSel ? colors.primary : mid ? colors.primarySoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Txt v="small" color={isSel ? '#fff' : disabled ? colors.ink4 : mid ? colors.primaryInk : colors.ink} style={{ fontWeight: isSel ? '800' : '500' }}>{d.getDate()}</Txt>
                {marked && !isSel ? <View style={{ position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.expense }} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function DateRangeSheet({ visible, onClose, onApply, initial }: { visible: boolean; onClose: () => void; onApply: (start: Date, endInclusive: Date) => void; initial?: { start: Date; end: Date } }) {
  const [start, setStart] = useState<Date | undefined>(initial?.start);
  const [end, setEnd] = useState<Date | undefined>(initial?.end);
  const [month, setMonth] = useState(initial?.start ?? new Date());
  const pick = (d: Date) => {
    if (!start || (start && end)) { setStart(d); setEnd(undefined); return; }
    if (d < start) { setEnd(start); setStart(d); } else setEnd(d);
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Custom range" subtitle={start ? `${format(start, 'd MMM yyyy')} → ${end ? format(end, 'd MMM yyyy') : '…'}` : 'Tap a start and an end date'}>
      <Calendar month={month} onMonthChange={setMonth} rangeStart={start} rangeEnd={end ?? start} onSelect={pick} />
      <View style={{ height: 14 }} />
      <Button label="Apply range" disabled={!start} onPress={() => start && onApply(start, end ?? start)} />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Date + time picker                                                  */
/* ------------------------------------------------------------------ */

export function DateTimeSheet({ visible, onClose, value, onChange }: { visible: boolean; onClose: () => void; value: Date; onChange: (d: Date) => void }) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState(value);
  const [month, setMonth] = useState(value);
  // Re-seed the draft each time the sheet opens (state derived from props, React-recommended pattern).
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) { setDraft(value); setMonth(value); }
  }
  const setTime = (h: number, min: number) => setDraft(new Date(draft.getFullYear(), draft.getMonth(), draft.getDate(), h, min));
  const quick = [
    { label: 'Now', d: new Date() },
    { label: 'Today 9 AM', d: (() => { const n = new Date(); n.setHours(9, 0, 0, 0); return n; })() },
    { label: 'Yesterday', d: (() => { const n = new Date(); n.setDate(n.getDate() - 1); return n; })() },
  ];
  const h12 = draft.getHours() % 12 || 12;
  const ampm = draft.getHours() >= 12 ? 'PM' : 'AM';
  return (
    <Sheet visible={visible} onClose={onClose} title="Date & time">
      <Row gap={8} style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        {quick.map((q) => <Chip key={q.label} label={q.label} onPress={() => { setDraft(q.d); setMonth(q.d); }} />)}
      </Row>
      <Calendar month={month} onMonthChange={setMonth} selected={draft} onSelect={(d) => setDraft(new Date(d.getFullYear(), d.getMonth(), d.getDate(), draft.getHours(), draft.getMinutes()))} />
      <View style={{ height: 14 }} />
      <Txt v="label" style={{ marginBottom: 8 }}>Time</Txt>
      <Row between style={{ backgroundColor: colors.surface2, borderRadius: 14, padding: 10 }}>
        <Stepper label="Hour" value={String(h12)} onInc={() => setTime((draft.getHours() + 1) % 24, draft.getMinutes())} onDec={() => setTime((draft.getHours() + 23) % 24, draft.getMinutes())} />
        <Stepper label="Min" value={String(draft.getMinutes()).padStart(2, '0')} onInc={() => setTime(draft.getHours(), (draft.getMinutes() + 5) % 60)} onDec={() => setTime(draft.getHours(), (draft.getMinutes() + 55) % 60)} />
        <Pressable onPress={() => setTime((draft.getHours() + 12) % 24, draft.getMinutes())} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primarySoft }}>
          <Txt v="bodyStrong" color={colors.primaryInk}>{ampm}</Txt>
        </Pressable>
      </Row>
      <View style={{ height: 14 }} />
      <Button label={`Set ${format(draft, 'd MMM, h:mm a')}`} onPress={() => { onChange(draft); onClose(); }} />
    </Sheet>
  );
}

function Stepper({ label, value, onInc, onDec }: { label: string; value: string; onInc: () => void; onDec: () => void }) {
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

/* ------------------------------------------------------------------ */
/* Account + category pickers                                          */
/* ------------------------------------------------------------------ */

export function AccountSheet({ visible, onClose, onSelect, exclude, title = 'Choose account', balances }: { visible: boolean; onClose: () => void; onSelect: (a: Account) => void; exclude?: string; title?: string; balances?: Record<string, string> }) {
  const accounts = useStore((s) => s.accounts).filter((a) => !a.archived && a.id !== exclude);
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {accounts.map((a, i) => (
        <ListItem key={a.id} left={<TileIcon name={a.icon} color={a.color} size={38} />} title={a.name} subtitle={accountTypeLabel(a.type)} right={balances ? <Txt v="small" tabular>{balances[a.id]}</Txt> : undefined} onPress={() => { onSelect(a); onClose(); }} last={i === accounts.length - 1} />
      ))}
      {accounts.length === 0 ? <Txt v="muted" center style={{ paddingVertical: 20 }}>No accounts available</Txt> : null}
    </Sheet>
  );
}

export function accountTypeLabel(t: Account['type']): string {
  return { bank: 'Bank account', cash: 'Cash', upi: 'UPI / Wallet', credit: 'Credit card', custom: 'Other' }[t];
}

export function CategorySheet({ visible, onClose, kind, onSelect, selectedId }: { visible: boolean; onClose: () => void; kind: 'expense' | 'income'; onSelect: (c: Category, subId?: string) => void; selectedId?: string }) {
  const { colors } = useTheme();
  const categories = useStore((s) => s.categories).filter((c) => c.kind === kind && !c.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  const [expanded, setExpanded] = useState<string | null>(selectedId ?? null);
  return (
    <Sheet visible={visible} onClose={onClose} title={kind === 'expense' ? 'Expense category' : 'Income category'} subtitle="Tap a category, or expand it to pick a subcategory">
      {categories.map((c, i) => (
        <View key={c.id}>
          <ListItem
            left={<TileIcon name={c.icon} color={c.color} size={38} />}
            title={c.name}
            subtitle={c.subcategories.length ? c.subcategories.map((s) => s.name).join(' · ') : undefined}
            right={c.subcategories.length ? (
              <Pressable hitSlop={8} onPress={() => setExpanded(expanded === c.id ? null : c.id)} style={{ padding: 6 }}>
                <Icon name={expanded === c.id ? 'chevron-up' : 'chevron-down'} size={20} color={colors.ink3} />
              </Pressable>
            ) : undefined}
            onPress={() => { onSelect(c); onClose(); }}
            last={i === categories.length - 1 && expanded !== c.id}
          />
          {expanded === c.id && c.subcategories.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12, paddingLeft: 50 }}>
              {c.subcategories.map((s) => <Chip key={s.id} label={s.name} onPress={() => { onSelect(c, s.id); onClose(); }} />)}
            </ScrollView>
          ) : null}
        </View>
      ))}
    </Sheet>
  );
}
