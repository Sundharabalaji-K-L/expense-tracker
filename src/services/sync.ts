import { collection, doc, onSnapshot, writeBatch, type DocumentData, type Unsubscribe } from 'firebase/firestore';
import { chunk, diffForPush, mergeRemote, reconcilePush, stripUndefined, type RemoteDoc, type Versioned } from '@/domain/sync';
import type { Account, Budget, Category, SyncedSettings, Transaction } from '@/domain/types';
import { useAuth, type AuthState } from '@/store/useAuth';
import { useStore, type AppState } from '@/store/useStore';
import { getDb } from './firebase';

type Kind = 'accounts' | 'categories' | 'transactions' | 'budgets';
const KINDS: Kind[] = ['accounts', 'categories', 'transactions', 'budgets'];
const BATCH = 400;

interface Shadow {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  settingsUpdatedAt: string;
}

interface Session {
  uid: string;
  unsubs: Unsubscribe[];
  shadow: Shadow;
  /** Latest full remote set per collection, used for reconciliation. */
  remote: Record<Kind, Map<string, RemoteDoc<Versioned>>>;
  remoteSettingsUpdatedAt: string | null;
  loaded: Set<string>;
  pushing: Promise<void>;
  stopped: boolean;
}

let session: Session | null = null;

function userDoc(uid: string, kind: Kind, id: string) {
  return doc(getDb(), 'users', uid, kind, id);
}

function settingsDoc(uid: string) {
  return doc(getDb(), 'users', uid, 'meta', 'settings');
}

function pickSynced(s: AppState['settings']): SyncedSettings {
  const { theme: _theme, ...rest } = s;
  return rest;
}

function setStatus(patch: Parameters<AuthState['setSync']>[0]) {
  useAuth.getState().setSync(patch);
}

/**
 * Starts cloud sync for the signed-in user. Local data belonging to a different user is cleared first.
 * Remote changes stream into the store; local changes are pushed as they happen; a full reconcile
 * runs once the first snapshots arrive so writes lost while offline are repaired.
 */
export function startSync(uid: string): void {
  if (session?.uid === uid) return;
  stopSync();
  const store = useStore.getState();
  if (store.ownerUid !== uid) {
    store.resetAll();
    store.setOwner(uid);
  }
  const s = useStore.getState();
  const current: Session = {
    uid,
    unsubs: [],
    shadow: { accounts: s.accounts, categories: s.categories, transactions: s.transactions, budgets: s.budgets, settingsUpdatedAt: s.settingsUpdatedAt },
    remote: { accounts: new Map(), categories: new Map(), transactions: new Map(), budgets: new Map() },
    remoteSettingsUpdatedAt: null,
    loaded: new Set(),
    pushing: Promise.resolve(),
    stopped: false,
  };
  session = current;
  setStatus({ syncStatus: 'syncing', initialLoaded: false, syncError: null });

  for (const kind of KINDS) {
    const unsub = onSnapshot(
      collection(getDb(), 'users', uid, kind),
      { includeMetadataChanges: false },
      (snap) => {
        if (current.stopped) return;
        const docs: RemoteDoc<Versioned>[] = [];
        snap.docChanges().forEach((c) => {
          const data = c.doc.data() as RemoteDoc<Versioned>;
          const d = { ...data, id: c.doc.id } as RemoteDoc<Versioned>;
          current.remote[kind].set(d.id, d);
          docs.push(d);
        });
        applyRemoteKind(current, kind, docs);
        markLoaded(current, kind, snap.metadata.fromCache);
      },
      (err) => setStatus({ syncStatus: 'error', syncError: err.message }),
    );
    current.unsubs.push(unsub);
  }

  const unsubSettings = onSnapshot(
    settingsDoc(uid),
    (snap) => {
      if (current.stopped) return;
      const data = snap.data() as (SyncedSettings & { updatedAt?: string }) | undefined;
      if (data?.updatedAt) {
        current.remoteSettingsUpdatedAt = data.updatedAt;
        if (data.updatedAt > useStore.getState().settingsUpdatedAt) {
          const { updatedAt, ...settings } = data;
          current.shadow.settingsUpdatedAt = updatedAt;
          useStore.getState().applyRemote({ settings, settingsUpdatedAt: updatedAt });
        }
      }
      markLoaded(current, 'settings', snap.metadata.fromCache);
    },
    (err) => setStatus({ syncStatus: 'error', syncError: err.message }),
  );
  current.unsubs.push(unsubSettings);

  const unsubStore = useStore.subscribe((state) => {
    if (current.stopped || useStore.getState().ownerUid !== uid) return;
    void pushLocalChanges(current, state);
  });
  current.unsubs.push(unsubStore);
}

export function stopSync(): void {
  if (!session) return;
  session.stopped = true;
  session.unsubs.forEach((u) => u());
  session = null;
  setStatus({ syncStatus: 'idle', initialLoaded: false });
}

/** Re-runs the reconciliation (e.g. when the app returns to the foreground). */
export function reconcileNow(): void {
  if (session && session.loaded.size === KINDS.length + 1) void reconcile(session);
}

function applyRemoteKind(s: Session, kind: Kind, docs: RemoteDoc<Versioned>[]): void {
  const store = useStore.getState();
  const local = store[kind] as Versioned[];
  const merged = mergeRemote(local, docs);
  if (merged === local) return;
  // Update the shadow first so the store subscription does not echo this change back.
  (s.shadow as unknown as Record<Kind, Versioned[]>)[kind] = merged;
  store.applyRemote({ [kind]: merged } as Parameters<AppState['applyRemote']>[0]);
}

function markLoaded(s: Session, key: string, fromCache: boolean): void {
  if (fromCache && !s.loaded.has(key)) return; // wait for server data before declaring the initial load done
  s.loaded.add(key);
  if (s.loaded.size === KINDS.length + 1 && !useAuth.getState().initialLoaded) {
    setStatus({ initialLoaded: true, syncStatus: 'synced', lastSyncedAt: new Date().toISOString() });
    void reconcile(s);
  }
}

async function reconcile(s: Session): Promise<void> {
  const state = useStore.getState();
  const ops: { kind: Kind; items: Versioned[] }[] = KINDS.map((kind) => ({ kind, items: reconcilePush(state[kind] as Versioned[], [...s.remote[kind].values()]) }));
  const total = ops.reduce((n, o) => n + o.items.length, 0);
  const settingsNewer = !s.remoteSettingsUpdatedAt || state.settingsUpdatedAt > s.remoteSettingsUpdatedAt;
  if (total === 0 && !settingsNewer) return;
  await enqueue(s, async () => {
    const writes: (() => void)[] = [];
    const batchRef = { batch: writeBatch(getDb()) };
    for (const { kind, items } of ops) for (const item of items) writes.push(() => batchRef.batch.set(userDoc(s.uid, kind, item.id), stripUndefined({ ...item, deleted: false }) as DocumentData));
    if (settingsNewer) writes.push(() => batchRef.batch.set(settingsDoc(s.uid), stripUndefined({ ...pickSynced(state.settings), updatedAt: state.settingsUpdatedAt }) as DocumentData));
    for (const group of chunk(writes, BATCH)) {
      batchRef.batch = writeBatch(getDb());
      group.forEach((w) => w());
      await batchRef.batch.commit();
    }
    if (settingsNewer) s.remoteSettingsUpdatedAt = state.settingsUpdatedAt;
  });
}

async function pushLocalChanges(s: Session, state: AppState): Promise<void> {
  const now = new Date().toISOString();
  const plans = KINDS.map((kind) => ({ kind, plan: diffForPush(s.shadow[kind] as Versioned[], state[kind] as Versioned[], now) }));
  const settingsChanged = state.settingsUpdatedAt !== s.shadow.settingsUpdatedAt;
  const count = plans.reduce((n, p) => n + p.plan.upserts.length + p.plan.deletes.length, 0) + (settingsChanged ? 1 : 0);
  if (count === 0) return;
  // Advance the shadow immediately so rapid successive edits are not pushed twice.
  for (const kind of KINDS) (s.shadow as unknown as Record<Kind, Versioned[]>)[kind] = state[kind] as Versioned[];
  s.shadow.settingsUpdatedAt = state.settingsUpdatedAt;
  await enqueue(s, async () => {
    const writes: (() => void)[] = [];
    const ref = { batch: writeBatch(getDb()) };
    for (const { kind, plan } of plans) {
      for (const item of plan.upserts) {
        s.remote[kind].set(item.id, { ...(item as Versioned), deleted: false } as RemoteDoc<Versioned>);
        writes.push(() => ref.batch.set(userDoc(s.uid, kind, item.id), stripUndefined({ ...item, deleted: false }) as DocumentData));
      }
      for (const del of plan.deletes) {
        s.remote[kind].set(del.id, { id: del.id, deleted: true, updatedAt: del.updatedAt });
        writes.push(() => ref.batch.set(userDoc(s.uid, kind, del.id), { id: del.id, deleted: true, updatedAt: del.updatedAt }));
      }
    }
    if (settingsChanged) {
      s.remoteSettingsUpdatedAt = state.settingsUpdatedAt;
      writes.push(() => ref.batch.set(settingsDoc(s.uid), stripUndefined({ ...pickSynced(state.settings), updatedAt: state.settingsUpdatedAt }) as DocumentData));
    }
    for (const group of chunk(writes, BATCH)) {
      ref.batch = writeBatch(getDb());
      group.forEach((w) => w());
      await ref.batch.commit();
    }
  });
}

/** Serialises pushes and reports status; failures are retried by the next reconcile. */
function enqueue(s: Session, work: () => Promise<void>): Promise<void> {
  s.pushing = s.pushing
    .then(async () => {
      if (s.stopped) return;
      setStatus({ syncStatus: 'syncing' });
      await work();
      setStatus({ syncStatus: 'synced', lastSyncedAt: new Date().toISOString(), syncError: null });
    })
    .catch((e: Error) => {
      const offline = /offline|unavailable|network/i.test(e.message);
      setStatus({ syncStatus: offline ? 'offline' : 'error', syncError: e.message });
    });
  return s.pushing;
}
