import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

let app: FirebaseApp | null = null;
let auth: FirebaseAuth.Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

/** Auth with persistent sessions: AsyncStorage on the phone, browser storage on web. */
export function getFirebaseAuth(): FirebaseAuth.Auth {
  if (auth) return auth;
  const a = getFirebaseApp();
  if (Platform.OS === 'web') {
    auth = FirebaseAuth.getAuth(a);
  } else {
    // getReactNativePersistence only exists in the React Native build of firebase/auth.
    const rn = FirebaseAuth as unknown as { getReactNativePersistence?: (storage: typeof AsyncStorage) => FirebaseAuth.Persistence };
    auth = rn.getReactNativePersistence
      ? FirebaseAuth.initializeAuth(a, { persistence: rn.getReactNativePersistence(AsyncStorage) })
      : FirebaseAuth.getAuth(a);
  }
  return auth;
}

export function getDb(): Firestore {
  if (db) return db;
  const a = getFirebaseApp();
  try {
    // Entities carry optional fields that may be undefined; Firestore rejects those unless told to ignore them.
    db = initializeFirestore(a, { ignoreUndefinedProperties: true, experimentalAutoDetectLongPolling: true });
  } catch {
    db = getFirestore(a);
  }
  return db;
}

/**
 * Maps Firebase auth error codes to messages for end users. Never exposes provider names, codes or
 * setup instructions; unexpected failures get a generic, actionable message and are logged for debugging.
 */
export function describeAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return 'Please enter a valid email address.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'The email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Please choose a stronger password with at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
    case 'auth/timeout':
      return 'Unable to connect. Please check your internet connection and try again.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
    case 'auth/internal-error':
      console.warn(`[auth] service error: ${code}`);
      return 'We are unable to process your request right now. Please try again later.';
    default:
      console.warn(`[auth] unexpected error: ${code || (e as Error)?.message}`);
      return 'Something went wrong. Please try again.';
  }
}
