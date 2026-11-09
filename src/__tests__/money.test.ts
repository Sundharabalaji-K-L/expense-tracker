import { compactNumber, formatMoney, groupDigits, parseAmount, percent, round2 } from '@/domain/money';
import { applyKey } from '@/components/ui/Keypad';

describe('money formatting', () => {
  test('Indian digit grouping', () => {
    expect(groupDigits('124860', true)).toBe('1,24,860');
    expect(groupDigits('1234567', true)).toBe('12,34,567');
    expect(groupDigits('999', true)).toBe('999');
    expect(groupDigits('1234567', false)).toBe('1,234,567');
  });

  test('formatMoney defaults', () => {
    expect(formatMoney(124860)).toBe('₹1,24,860');
    expect(formatMoney(420.5)).toBe('₹420.50');
    expect(formatMoney(-2000)).toBe('−₹2,000');
    expect(formatMoney(2000, { sign: true })).toBe('+₹2,000');
    expect(formatMoney(2000, { decimals: 'always' })).toBe('₹2,000.00');
    expect(formatMoney(1500, { currency: 'USD' })).toBe('$1,500');
  });

  test('compact formatting', () => {
    expect(formatMoney(35650, { compact: true })).toBe('₹35.6k');
    expect(formatMoney(124860, { compact: true })).toBe('₹1.25L');
    expect(formatMoney(12000000, { compact: true })).toBe('₹1.2Cr');
    expect(compactNumber(1500000, false)).toBe('1.5M');
    expect(formatMoney(999, { compact: true })).toBe('₹999');
  });

  test('parseAmount and round2', () => {
    expect(parseAmount('1,234.567')).toBe(1234.57);
    expect(parseAmount('abc')).toBe(0);
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(percent(50, 200)).toBe(25);
    expect(percent(10, 0)).toBe(0);
  });
});

describe('keypad', () => {
  test('builds amounts with a single decimal point and two decimals', () => {
    let v = '0';
    for (const k of ['4', '2', '0', '.', '5', '0', '7']) v = applyKey(v, k);
    expect(v).toBe('420.50');
    expect(applyKey('420.50', '.')).toBe('420.50');
    expect(applyKey('0', '0')).toBe('0');
    expect(applyKey('0', '7')).toBe('7');
    expect(applyKey('7', 'back')).toBe('0');
    expect(applyKey('75', 'back')).toBe('7');
    expect(applyKey('75', 'clear')).toBe('0');
    expect(applyKey('123456789', '0')).toBe('123456789');
  });
});
