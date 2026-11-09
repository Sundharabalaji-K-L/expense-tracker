import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/store/useAuth';
import { useTheme } from '@/theme/ThemeProvider';
import { Txt } from '@/components/ui/Txt';

/** How long to wait for the first cloud snapshot before continuing with the local cache. */
const INITIAL_SYNC_TIMEOUT_MS = 8000;

export default function Index() {
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.settings.onboarded);
  const ready = useAuth((s) => s.ready);
  const user = useAuth((s) => s.user);
  const initialLoaded = useAuth((s) => s.initialLoaded);
  const { colors } = useTheme();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!user || initialLoaded) return;
    const t = setTimeout(() => setTimedOut(true), INITIAL_SYNC_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [user, initialLoaded]);

  const waiting = !hydrated || !ready || (user && !initialLoaded && !timedOut);
  if (waiting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: 12 }}>
        <ActivityIndicator color={colors.primary} />
        {user ? <Txt v="muted">Syncing your data…</Txt> : null}
      </View>
    );
  }
  if (!user) return <Redirect href="/auth" />;
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
