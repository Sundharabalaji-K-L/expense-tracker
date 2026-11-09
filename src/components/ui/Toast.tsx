import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';
import { Txt } from './Txt';

interface ToastItem {
  id: number;
  message: string;
  tone: 'info' | 'ok' | 'warn' | 'danger';
  action?: { label: string; onPress: () => void };
}

const ToastContext = createContext<(message: string, opts?: { tone?: ToastItem['tone']; action?: ToastItem['action'] }) => void>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, opts?: { tone?: ToastItem['tone']; action?: ToastItem['action'] }) => {
    setToast({ id: Date.now(), message, tone: opts?.tone ?? 'info', action: opts?.action });
  }, []);

  useEffect(() => {
    if (!toast) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, toast.action ? 5000 : 2800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, opacity]);

  const iconFor = { info: 'information', ok: 'check-circle', warn: 'alert', danger: 'alert-circle' }[toast?.tone ?? 'info'];
  const colorFor = { info: colors.primaryInk, ok: colors.income, warn: colors.warn, danger: colors.expense }[toast?.tone ?? 'info'];

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: 20, right: 20, bottom: 100 + insets.bottom, opacity }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.ink, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Icon name={iconFor} size={18} color={colorFor} />
            <Txt v="small" color={colors.surface} style={{ flex: 1, fontWeight: '600' }}>{toast.message}</Txt>
            {toast.action ? (
              <Pressable onPress={() => { toast.action?.onPress(); setToast(null); }}>
                <Txt v="small" color={colors.primaryInk} style={{ fontWeight: '700' }}>{toast.action.label}</Txt>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
