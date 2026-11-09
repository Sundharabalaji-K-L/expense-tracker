const SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$' };

export function currencySymbol(code: string): string {
  return SYMBOLS[code] ?? `${code} `;
}

/** Rounds to 2 decimals, avoiding float drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Indian grouping (12,34,567) for INR, western grouping otherwise. */
export function groupDigits(intPart: string, indian: boolean): string {
  if (!indian) return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

export interface FormatOptions {
  currency?: string;
  /** Show paise/cents. Default: only when non-zero. */
  decimals?: 'auto' | 'always' | 'never';
  /** Prefix with + / − for signed display. */
  sign?: boolean;
  compact?: boolean;
}

export function formatMoney(amount: number, opts: FormatOptions = {}): string {
  const currency = opts.currency ?? 'INR';
  const symbol = currencySymbol(currency);
  const negative = amount < 0;
  const abs = Math.abs(round2(amount));

  if (opts.compact && abs >= 1000) {
    const compact = compactNumber(abs, currency === 'INR');
    return `${negative ? '−' : opts.sign ? '+' : ''}${symbol}${compact}`;
  }

  const fixed = abs.toFixed(2);
  const [intPart, frac] = fixed.split('.');
  const grouped = groupDigits(intPart, currency === 'INR');
  const showDecimals = opts.decimals === 'always' || (opts.decimals !== 'never' && frac !== '00');
  const body = showDecimals ? `${grouped}.${frac}` : grouped;
  const prefix = negative ? '−' : opts.sign ? '+' : '';
  return `${prefix}${symbol}${body}`;
}

export function compactNumber(abs: number, indian: boolean): string {
  if (indian) {
    if (abs >= 1e7) return `${trim(abs / 1e7)}Cr`;
    if (abs >= 1e5) return `${trim(abs / 1e5)}L`;
    if (abs >= 1e3) return `${trim(abs / 1e3)}k`;
    return trim(abs);
  }
  if (abs >= 1e9) return `${trim(abs / 1e9)}B`;
  if (abs >= 1e6) return `${trim(abs / 1e6)}M`;
  if (abs >= 1e3) return `${trim(abs / 1e3)}k`;
  return trim(abs);
}

function trim(n: number): string {
  const s = n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2);
  return s.replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1');
}

/** Parses the keypad input string ("1,234.5") to a number. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? round2(n) : 0;
}

export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}
