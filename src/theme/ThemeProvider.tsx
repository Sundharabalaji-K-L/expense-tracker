import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useStore } from '@/store/useStore';
import { darkColors, lightColors, radius, seriesDark, seriesLight, space, type Colors } from './tokens';

export interface Theme {
  colors: Colors;
  isDark: boolean;
  radius: typeof radius;
  space: typeof space;
  series: string[];
}

const ThemeContext = createContext<Theme>({ colors: lightColors, isDark: false, radius, space, series: seriesLight });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useStore((s) => s.settings.theme);
  const system = useColorScheme();
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const value = useMemo<Theme>(
    () => ({ colors: isDark ? darkColors : lightColors, isDark, radius, space, series: isDark ? seriesDark : seriesLight }),
    [isDark],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
