import { useMemo } from 'react';
import { useStore, useUiStore } from './useStore';
import { cycleConfigFromSettings, getCycle, shiftCycle, type Cycle } from '@/domain/cycle';
import { filterTransactions } from '@/domain/analytics';
import type { DateRange } from '@/domain/types';
import { format } from 'date-fns';

export interface PeriodSelection {
  cycle: Cycle;
  range: DateRange;
  label: string;
  isCustom: boolean;
  isCurrent: boolean;
}

/** The period (cycle or custom range) currently selected in the UI. */
export function usePeriod(now = new Date()): PeriodSelection {
  const settings = useStore((s) => s.settings);
  const cycleOffset = useUiStore((s) => s.cycleOffset);
  const customRange = useUiStore((s) => s.customRange);
  const today = now.toDateString();
  return useMemo(() => {
    const cfg = cycleConfigFromSettings(settings);
    const current = getCycle(now, cfg);
    const cycle = cycleOffset === 0 ? current : shiftCycle(current, cycleOffset, cfg);
    if (customRange) {
      const start = new Date(customRange.start);
      const end = new Date(customRange.end);
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
      return { cycle, range: { start, end }, label: `${format(start, 'd MMM')} – ${format(last, 'd MMM')}`, isCustom: true, isCurrent: false };
    }
    return { cycle, range: cycle, label: cycle.label, isCustom: false, isCurrent: cycleOffset === 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.cycleMode, settings.cycleStartDay, cycleOffset, customRange?.start, customRange?.end, today]);
}

/** Transactions within the selected period, optionally narrowed to the selected account. */
export function usePeriodTransactions(accountId?: string | null) {
  const txns = useStore((s) => s.transactions);
  const filterAccount = useUiStore((s) => s.accountFilter);
  const period = usePeriod();
  const acc = accountId === undefined ? filterAccount : accountId;
  return useMemo(() => filterTransactions(txns, { range: period.range, accountId: acc }), [txns, period.range, acc]);
}

export function useAccount(id?: string) {
  return useStore((s) => s.accounts.find((a) => a.id === id));
}

export function useCategory(id?: string) {
  return useStore((s) => s.categories.find((c) => c.id === id));
}

export function useCategoriesByKind(kind: 'expense' | 'income') {
  const categories = useStore((s) => s.categories);
  return useMemo(() => categories.filter((c) => c.kind === kind && !c.archived).sort((a, b) => a.sortOrder - b.sortOrder), [categories, kind]);
}

export function useActiveAccounts() {
  const accounts = useStore((s) => s.accounts);
  return useMemo(() => accounts.filter((a) => !a.archived), [accounts]);
}
