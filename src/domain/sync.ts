/**
 * Pure merge/diff logic for cloud sync. Entities are keyed by id and versioned by an ISO `updatedAt`.
 * Deletions are tombstones (`deleted: true`) so that removals propagate to every device.
 */

export interface Versioned {
  id: string;
  updatedAt?: string;
}

export type RemoteDoc<T extends Versioned> = (T & { deleted?: false }) | { id: string; deleted: true; updatedAt: string };

export interface PushPlan<T extends Versioned> {
  upserts: T[];
  deletes: { id: string; updatedAt: string }[];
}

const ZERO = '0000-00-00T00:00:00';

export function version(e: { updatedAt?: string } | undefined): string {
  return e?.updatedAt ?? ZERO;
}

/**
 * Applies remote documents to the local list. Remote wins only when it is newer; a tombstone removes
 * the local entity unless the local copy was modified after the deletion.
 * Returns the same array reference when nothing changed so callers can skip state updates.
 */
export function mergeRemote<T extends Versioned>(local: T[], remote: RemoteDoc<T>[]): T[] {
  if (remote.length === 0) return local;
  const byId = new Map(local.map((e) => [e.id, e] as const));
  let changed = false;
  for (const doc of remote) {
    const cur = byId.get(doc.id);
    if (doc.deleted) {
      if (cur && version(cur) <= doc.updatedAt) {
        byId.delete(doc.id);
        changed = true;
      }
      continue;
    }
    if (!cur || version(doc) > version(cur)) {
      byId.set(doc.id, doc as T);
      changed = true;
    }
  }
  if (!changed) return local;
  // Preserve local ordering for survivors, append new ones.
  const out: T[] = [];
  for (const e of local) {
    const v = byId.get(e.id);
    if (v) {
      out.push(v);
      byId.delete(e.id);
    }
  }
  for (const v of byId.values()) out.push(v);
  return out;
}

/**
 * Computes what must be pushed to make the remote match `current`, given `shadow` (the last state known
 * to be in sync). Changed entities are detected by object identity, which the store guarantees.
 */
export function diffForPush<T extends Versioned>(shadow: T[], current: T[], now: string): PushPlan<T> {
  const prev = new Map(shadow.map((e) => [e.id, e] as const));
  const upserts: T[] = [];
  const seen = new Set<string>();
  for (const e of current) {
    seen.add(e.id);
    if (prev.get(e.id) !== e) upserts.push(e);
  }
  const deletes = shadow.filter((e) => !seen.has(e.id)).map((e) => ({ id: e.id, updatedAt: now }));
  return { upserts, deletes };
}

/**
 * Full reconciliation against the complete remote set: pushes local entities that are missing remotely
 * or newer than the remote copy, and tombstones nothing (local absence is handled by diffForPush).
 */
export function reconcilePush<T extends Versioned>(local: T[], remote: RemoteDoc<T>[]): T[] {
  const remoteById = new Map(remote.map((d) => [d.id, d] as const));
  return local.filter((e) => {
    const r = remoteById.get(e.id);
    if (!r) return true;
    if (r.deleted) return version(e) > r.updatedAt;
    return version(e) > version(r);
  });
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Removes `undefined` values so documents are valid for Firestore. */
export function stripUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as T;
}
