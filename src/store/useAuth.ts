import { create } from 'zustand';

export interface AuthUser {
  uid: string;
  email: string | null;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface AuthState {
  /** False until Firebase has reported the persisted session (or lack of one). */
  ready: boolean;
  user: AuthUser | null;
  syncStatus: SyncStatus;
  /** True once the first full snapshot from the cloud has been applied for the current user. */
  initialLoaded: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  setReady: (ready: boolean) => void;
  setUser: (user: AuthUser | null) => void;
  setSync: (patch: Partial<Pick<AuthState, 'syncStatus' | 'initialLoaded' | 'lastSyncedAt' | 'syncError'>>) => void;
}

export const useAuth = create<AuthState>()((set) => ({
  ready: false,
  user: null,
  syncStatus: 'idle',
  initialLoaded: false,
  lastSyncedAt: null,
  syncError: null,
  setReady: (ready) => set({ ready }),
  setUser: (user) => set({ user }),
  setSync: (patch) => set(patch),
}));
