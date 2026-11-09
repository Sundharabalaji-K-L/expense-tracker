import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import { markNoSpend, markPrompted, pruneReminderState, shouldPromptNow } from '@/domain/reminders';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/store/useAuth';
import { startAuthListener } from '@/services/auth';
import { reconcileNow } from '@/services/sync';
import { addResponseListener, buildReminderContext, initNotifications, syncReminderSchedule, type ReminderAction } from '@/services/notifications';

/**
 * Wires authentication, cloud sync, notifications and the daily reminder to the store.
 * Runs once in the root layout.
 */
export function useBootstrap() {
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.settings.onboarded);
  const ready = useAuth((s) => s.ready);
  const user = useAuth((s) => s.user);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUid = useRef<string | null | undefined>(undefined);

  // Auth session: start listening once local data is available.
  useEffect(() => {
    if (!hydrated) return;
    return startAuthListener();
  }, [hydrated]);

  // Route on sign-in / sign-out transitions (the index route decides between onboarding and tabs).
  useEffect(() => {
    if (!ready) return;
    const uid = user?.uid ?? null;
    if (prevUid.current !== undefined && prevUid.current !== uid) {
      router.replace(uid ? '/' : '/auth');
    }
    prevUid.current = uid;
  }, [ready, user]);

  // Notifications and reminders: only for a signed-in, onboarded user.
  useEffect(() => {
    if (!hydrated || !onboarded || !user) return;
    let unsubscribeResponses = () => undefined as void;

    const handle = (action: ReminderAction) => {
      const store = useStore.getState();
      if (action === 'nospend') {
        store.setReminderState((s) => markNoSpend(s, new Date()));
        void syncReminderSchedule();
        return;
      }
      if (action === 'add') {
        router.push('/transaction/edit?type=expense');
        return;
      }
      router.push(action === 'later' ? '/reminder?mode=later' : '/reminder');
    };

    const checkPrompt = () => {
      const store = useStore.getState();
      const now = new Date();
      store.setReminderState((s) => pruneReminderState(s, now));
      const ctx = buildReminderContext(now);
      if (shouldPromptNow(ctx)) {
        store.setReminderState((s) => markPrompted(s, now));
        router.push('/reminder');
      }
    };

    (async () => {
      await initNotifications();
      unsubscribeResponses = addResponseListener(handle);
      await syncReminderSchedule();
      // On web there are no OS notifications: the in-app prompt is the reminder.
      if (Platform.OS === 'web') checkPrompt();
    })();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkPrompt();
        void syncReminderSchedule();
        reconcileNow();
      }
    });

    // Any transaction / settings change re-plans the reminders (debounced).
    const unsubscribeStore = useStore.subscribe((s, prev) => {
      if (s.transactions !== prev.transactions || s.settings.reminder !== prev.settings.reminder || s.reminder !== prev.reminder) {
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => void syncReminderSchedule(), 800);
      }
    });

    // Web fallback: poll once a minute while the tab is open.
    const interval = Platform.OS === 'web' ? setInterval(checkPrompt, 60_000) : null;

    return () => {
      unsubscribeResponses();
      sub.remove();
      unsubscribeStore();
      if (interval) clearInterval(interval);
    };
  }, [hydrated, onboarded, user]);
}
