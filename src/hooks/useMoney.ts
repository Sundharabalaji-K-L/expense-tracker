import { useCallback } from 'react';
import { formatMoney, type FormatOptions } from '@/domain/money';
import { useStore } from '@/store/useStore';

/** Currency-aware formatter bound to the user's settings. */
export function useMoney() {
  const currency = useStore((s) => s.settings.currency);
  return useCallback((amount: number, opts?: Omit<FormatOptions, 'currency'>) => formatMoney(amount, { ...opts, currency }), [currency]);
}
