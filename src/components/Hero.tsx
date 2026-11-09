import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop, RadialGradient } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { Txt } from './ui/Txt';
import { Icon } from './ui/Icon';

const palettes = {
  blue: ['#2563eb', '#1b3a8f', '#0b1b3f'],
  green: ['#22c55e', '#0f9d58', '#064e3b'],
  violet: ['#8b7cf6', '#5b48c8', '#2b1f6e'],
  rose: ['#fb7185', '#e03e3e', '#6b1111'],
  slate: ['#64748b', '#334155', '#0f172a'],
  amber: ['#fbbf24', '#d97706', '#78350f'],
};

export type HeroTone = keyof typeof palettes;

/** Gradient hero card used for the headline balance. */
export function Hero({ children, tone = 'blue', style, color }: { children: React.ReactNode; tone?: HeroTone; style?: StyleProp<ViewStyle>; color?: string }) {
  const [a, b, c] = color ? [lighten(color, 0.25), color, darken(color, 0.55)] : palettes[tone];
  // react-native-svg does not size reliably with percentages on Android, so measure the card and
  // draw the gradient with exact pixel dimensions. The solid backgroundColor covers the first frame.
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const gid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View
      onLayout={(e) => setSize({ w: Math.ceil(e.nativeEvent.layout.width), h: Math.ceil(e.nativeEvent.layout.height) })}
      style={[{ borderRadius: 24, overflow: 'hidden', padding: 20, marginBottom: 14, backgroundColor: b, shadowColor: b, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 6 }, style]}
    >
      {size.w > 0 && size.h > 0 ? (
        <Svg pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0 }} width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}>
          <Defs>
            <LinearGradient id={`g${gid}`} x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={a} />
              <Stop offset="0.5" stopColor={b} />
              <Stop offset="1" stopColor={c} />
            </LinearGradient>
            <RadialGradient id={`r${gid}`} cx={size.w * 0.85} cy={size.h * 1.1} r={size.w * 0.6} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.22} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={size.h} fill={`url(#g${gid})`} />
          <Rect x={0} y={0} width={size.w} height={size.h} fill={`url(#r${gid})`} />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

export function HeroMini({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 11 }}>
      <Txt v="caption" color="rgba(255,255,255,0.78)">{label}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
        {icon}
        <Txt v="bodyStrong" color="#fff" tabular style={{ fontWeight: '700' }}>{value}</Txt>
      </View>
    </View>
  );
}

export function KpiTile({ label, value, tone, delta, icon, style }: { label: string; value: string; tone?: 'income' | 'expense' | 'neutral' | 'primary'; delta?: string; icon?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const fg = tone === 'income' ? colors.incomeInk : tone === 'expense' ? colors.expenseInk : tone === 'primary' ? colors.primaryInk : colors.ink;
  const soft = tone === 'income' ? colors.incomeSoft : tone === 'expense' ? colors.expenseSoft : colors.primarySoft;
  return (
    <View style={[{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? (
          <View style={{ width: 18, height: 18, borderRadius: 6, backgroundColor: soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={11} color={fg} />
          </View>
        ) : null}
        <Txt v="label" numberOfLines={1} style={{ fontSize: 10 }}>{label}</Txt>
      </View>
      <Txt v="h2" color={fg} tabular numberOfLines={1} style={{ marginTop: 5, fontSize: 17 }}>{value}</Txt>
      {delta ? <Txt v="caption" style={{ marginTop: 2 }}>{delta}</Txt> : null}
    </View>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')}`;
}
export function lighten(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}
export function darken(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amt), g * (1 - amt), b * (1 - amt));
}
