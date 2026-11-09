import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'small' | 'muted' | 'label' | 'caption';

const variants: Record<Variant, TextStyle> = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8, lineHeight: 38 },
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, lineHeight: 28 },
  h2: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, lineHeight: 22 },
  h3: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodyStrong: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  small: { fontSize: 12.5, fontWeight: '500', lineHeight: 17 },
  muted: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', lineHeight: 14 },
  caption: { fontSize: 11, fontWeight: '500', lineHeight: 14 },
};

export interface TxtProps extends TextProps {
  v?: Variant;
  color?: string;
  center?: boolean;
  tabular?: boolean;
}

export function Txt({ v = 'body', color, center, tabular, style, ...rest }: TxtProps) {
  const { colors } = useTheme();
  const defaultColor = v === 'muted' || v === 'label' || v === 'caption' ? colors.ink3 : colors.ink;
  return (
    <Text
      maxFontSizeMultiplier={1.25}
      {...rest}
      style={[
        variants[v],
        { color: color ?? defaultColor },
        center && { textAlign: 'center' },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
