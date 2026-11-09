import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { useBootstrap } from '@/hooks/useBootstrap';

function Shell() {
  const { colors, isDark } = useTheme();
  useBootstrap();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Android system navigation bar follows the theme: dark bar with light buttons in dark mode. */}
      {Platform.OS === 'android' ? <NavigationBar style={isDark ? 'dark' : 'light'} /> : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="transaction/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="reminder" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
