import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';
import { Txt } from './Txt';

export function Screen({ children, scroll = true, padded = true, style, contentStyle, edges }: { children: React.ReactNode; scroll?: boolean; padded?: boolean; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle>; edges?: ('top' | 'bottom')[] }) {
  const { colors } = useTheme();
  const inner = padded ? { paddingHorizontal: 20 } : undefined;
  return (
    <SafeAreaView edges={edges ?? ['top']} style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[inner, { paddingBottom: 120 }, contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/**
 * Screen header. Large headers (tab roots) keep the full width for the title and place the
 * actions on their own row underneath, so long titles and period chips never fight for space.
 */
export function AppBar({ title, subtitle, back, right, large }: { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode; large?: boolean }) {
  const titleBlock = (
    <View style={{ flex: 1, minWidth: 0 }}>
      {subtitle ? <Txt v="muted" numberOfLines={1} style={{ marginBottom: 2 }}>{subtitle}</Txt> : null}
      <Txt v={large ? 'h1' : 'h2'} numberOfLines={1}>{title}</Txt>
    </View>
  );
  const actions = right ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 0 }}>{right}</View> : null;
  if (large) {
    return (
      <View style={{ paddingTop: 6, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {back && <IconButton name="chevron-left" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />}
          {titleBlock}
        </View>
        {actions ? <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>{actions}</View> : null}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, paddingBottom: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        {back && <IconButton name="chevron-left" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />}
        {titleBlock}
      </View>
      {actions}
    </View>
  );
}

export function IconButton({ name, onPress, color, bg, size = 40, badge, round, testID }: { name: string; onPress?: () => void; color?: string; bg?: string; size?: number; badge?: number; round?: boolean; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: round ? size / 2 : 14,
        backgroundColor: bg ?? colors.surface2,
        borderWidth: 1,
        borderColor: bg ? 'transparent' : colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={name} size={Math.round(size * 0.5)} color={color ?? colors.ink2} />
      {badge ? (
        <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.expense, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.surface }}>
          <Txt v="caption" color="#fff" style={{ fontSize: 9, lineHeight: 11, fontWeight: '800' }}>{badge}</Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Card({ children, style, flat, onPress, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; flat?: boolean; onPress?: () => void; testID?: string }) {
  const { colors } = useTheme();
  const base: ViewStyle = {
    backgroundColor: flat ? colors.surface2 : colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: flat ? 'transparent' : colors.border,
    ...(flat ? {} : shadow),
  };
  if (onPress) {
    return (
      <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View testID={testID} style={[base, style]}>{children}</View>;
}

export const shadow: ViewStyle = {
  shadowColor: '#0b1220',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

export function CardTitle({ title, right, sub }: { title: string; right?: React.ReactNode; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <Txt v="h3">{title}</Txt>
      {right ?? (sub ? <Txt v="muted">{sub}</Txt> : null)}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  loading,
  style,
  testID,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost';
  size?: 'md' | 'sm';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: 'transparent' },
    secondary: { bg: colors.primarySoft, fg: colors.primaryInk, border: 'transparent' },
    ghost: { bg: colors.surface2, fg: colors.ink, border: colors.border },
    danger: { bg: colors.expense, fg: '#fff', border: 'transparent' },
    dangerGhost: { bg: colors.expenseSoft, fg: colors.expenseInk, border: 'transparent' },
  }[variant];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: size === 'md' ? 14 : 10,
          paddingHorizontal: size === 'md' ? 18 : 14,
          borderRadius: size === 'md' ? 14 : 11,
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : icon ? <Icon name={icon} size={18} color={palette.fg} /> : null}
      <Txt v="bodyStrong" color={palette.fg} style={{ fontWeight: '700', fontSize: size === 'md' ? 14.5 : 13 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Chip({ label, icon, active, onPress, tone = 'neutral', trailingIcon, style }: { label: string; icon?: string; active?: boolean; onPress?: () => void; tone?: 'neutral' | 'primary' | 'solid'; trailingIcon?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const t = active || tone === 'solid' ? { bg: colors.ink, fg: colors.surface, border: 'transparent' } : tone === 'primary' ? { bg: colors.primarySoft, fg: colors.primaryInk, border: 'transparent' } : { bg: colors.surface2, fg: colors.ink2, border: colors.border };
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, opacity: pressed ? 0.8 : 1 }, style]}>
      {icon ? <Icon name={icon} size={14} color={t.fg} /> : null}
      <Txt v="small" color={t.fg} style={{ fontWeight: '600' }}>{label}</Txt>
      {trailingIcon ? <Icon name={trailingIcon} size={14} color={t.fg} /> : null}
    </Pressable>
  );
}

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: 'ok' | 'warn' | 'over' | 'info' | 'neutral' | 'trf'; icon?: string }) {
  const { colors } = useTheme();
  const t = {
    ok: { bg: colors.incomeSoft, fg: colors.incomeInk },
    warn: { bg: colors.warnSoft, fg: colors.warnInk },
    over: { bg: colors.expenseSoft, fg: colors.expenseInk },
    info: { bg: colors.primarySoft, fg: colors.primaryInk },
    neutral: { bg: colors.surface3, fg: colors.ink2 },
    trf: { bg: colors.transferSoft, fg: colors.transferInk },
  }[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 7, backgroundColor: t.bg }}>
      {icon ? <Icon name={icon} size={12} color={t.fg} /> : null}
      <Txt v="caption" color={t.fg} style={{ fontWeight: '700', fontSize: 10.5 }}>{label}</Txt>
    </View>
  );
}

export function ListItem({ left, title, subtitle, right, onPress, chevron, last, testID }: { left?: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; chevron?: boolean; last?: boolean; testID?: string }) {
  const { colors } = useTheme();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="bodyStrong" numberOfLines={1}>{title}</Txt>
        {subtitle ? <Txt v="muted" numberOfLines={1} style={{ marginTop: 1 }}>{subtitle}</Txt> : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron-right" size={20} color={colors.ink4} /> : null}
    </View>
  );
  if (!onPress) return <View testID={testID}>{body}</View>;
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {body}
    </Pressable>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 }} />;
}

export function ProgressBar({ value, tone = 'primary', height = 8 }: { value: number; tone?: 'primary' | 'ok' | 'warn' | 'over'; height?: number }) {
  const { colors } = useTheme();
  const fill = { primary: colors.primary, ok: colors.income, warn: colors.warn, over: colors.expense }[tone];
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: colors.surface3, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', borderRadius: height / 2, backgroundColor: fill }} />
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange, tones }: { options: { value: T; label: string; icon?: string }[]; value: T; onChange: (v: T) => void; tones?: Partial<Record<T, string>> }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface3, borderRadius: 13, padding: 4, marginBottom: 16 }}>
      {options.map((o) => {
        const on = o.value === value;
        const fg = on ? (tones?.[o.value] ?? colors.ink) : colors.ink3;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, backgroundColor: on ? colors.surface : 'transparent', ...(on ? shadow : {}) }}>
            {o.icon ? <Icon name={o.icon} size={15} color={fg} /> : null}
            <Txt v="small" color={fg} style={{ fontWeight: '700' }}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Switch({ value, onChange, testID }: { value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} style={{ width: 46, height: 27, borderRadius: 14, backgroundColor: value ? colors.income : colors.border2, padding: 3, justifyContent: 'center' }}>
      <View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: '#fff', alignSelf: value ? 'flex-end' : 'flex-start', ...shadow }} />
    </Pressable>
  );
}

export function Radio({ on }: { on: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? colors.primary : colors.border2, alignItems: 'center', justifyContent: 'center' }}>
      {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
    </View>
  );
}

export function Note({ children, tone = 'info', icon }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'ok' | 'danger'; icon?: string }) {
  const { colors } = useTheme();
  const t = { info: { bg: colors.primarySoft, fg: colors.primaryInk }, warn: { bg: colors.warnSoft, fg: colors.warnInk }, ok: { bg: colors.incomeSoft, fg: colors.incomeInk }, danger: { bg: colors.expenseSoft, fg: colors.expenseInk } }[tone];
  return (
    <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: t.bg, borderRadius: 12, padding: 12, marginBottom: 14 }}>
      <Icon name={icon ?? (tone === 'warn' ? 'alert' : tone === 'ok' ? 'check-circle' : 'information')} size={16} color={t.fg} />
      <Txt v="small" color={t.fg} style={{ flex: 1 }}>{children}</Txt>
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 }}>
      <View style={{ width: 96, height: 96, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Icon name={icon} size={42} color={colors.primary} />
      </View>
      <Txt v="h2" center>{title}</Txt>
      <Txt v="body" center color={colors.ink2} style={{ marginTop: 6, marginBottom: 18 }}>{body}</Txt>
      {action}
    </View>
  );
}

export function Row({ children, style, gap = 10, between, center }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number; between?: boolean; center?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: center === false ? 'flex-start' : 'center', gap, justifyContent: between ? 'space-between' : 'flex-start' }, style]}>{children}</View>;
}

export function Spacer({ h = 12 }: { h?: number }) {
  return <View style={{ height: h }} />;
}

export function PressableScale(props: PressableProps) {
  return <Pressable {...props} style={(s) => [typeof props.style === 'function' ? props.style(s) : props.style, s.pressed && { opacity: 0.8 }]} />;
}
