import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { useAuth } from '@/store/useAuth';
import { useStore } from '@/store/useStore';
import { getFirebaseAuth } from './firebase';
import { startSync, stopSync } from './sync';

let started = false;

/** Subscribes to the Firebase session once and keeps the auth store and sync engine in step with it. */
export function startAuthListener(): () => void {
  if (started) return () => undefined;
  started = true;
  const unsub = onAuthStateChanged(getFirebaseAuth(), (fbUser) => {
    const auth = useAuth.getState();
    if (fbUser) {
      auth.setUser({ uid: fbUser.uid, email: fbUser.email });
      startSync(fbUser.uid);
    } else {
      stopSync();
      auth.setUser(null);
    }
    if (!auth.ready) auth.setReady(true);
  });
  return () => {
    started = false;
    unsub();
  };
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

export async function signUp(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

/** Signs out and clears the local cache; the data stays in the cloud. */
export async function signOut(): Promise<void> {
  stopSync();
  await fbSignOut(getFirebaseAuth());
  const store = useStore.getState();
  store.resetAll();
  store.setOwner(null);
}
