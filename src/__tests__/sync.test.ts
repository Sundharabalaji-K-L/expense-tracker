import { chunk, diffForPush, mergeRemote, reconcilePush, stripUndefined, version, type RemoteDoc } from '@/domain/sync';

interface E { id: string; name: string; updatedAt?: string }
const e = (id: string, name: string, updatedAt?: string): E => ({ id, name, updatedAt });
const tomb = (id: string, updatedAt: string): RemoteDoc<E> => ({ id, deleted: true, updatedAt });

describe('sync merge', () => {
  test('remote newer wins, local newer is kept, missing is added', () => {
    const local = [e('a', 'local-a', '2026-01-02'), e('b', 'local-b', '2026-01-05')];
    const remote: RemoteDoc<E>[] = [e('a', 'remote-a', '2026-01-03'), e('b', 'remote-b', '2026-01-04'), e('c', 'remote-c', '2026-01-01')];
    const merged = mergeRemote(local, remote);
    expect(merged.map((x) => x.name)).toEqual(['remote-a', 'local-b', 'remote-c']);
  });

  test('tombstones remove local entities unless the local copy is newer', () => {
    const local = [e('a', 'a', '2026-01-01'), e('b', 'b', '2026-01-09'), e('c', 'c')];
    const merged = mergeRemote(local, [tomb('a', '2026-01-02'), tomb('b', '2026-01-05'), tomb('c', '2026-01-01'), tomb('zzz', '2026-01-01')]);
    expect(merged.map((x) => x.id)).toEqual(['b']);
  });

  test('returns the same reference when nothing changes', () => {
    const local = [e('a', 'a', '2026-01-05')];
    expect(mergeRemote(local, [])).toBe(local);
    expect(mergeRemote(local, [e('a', 'older', '2026-01-01')])).toBe(local);
    expect(mergeRemote(local, [e('a', 'same', '2026-01-05')])).toBe(local);
  });
});

describe('sync diff', () => {
  test('detects added, changed (by identity) and removed entities', () => {
    const a = e('a', 'a', '1');
    const b = e('b', 'b', '1');
    const shadow = [a, b];
    const b2 = { ...b, name: 'b2', updatedAt: '2' };
    const c = e('c', 'c', '1');
    const plan = diffForPush(shadow, [a, b2, c], '2026-01-10');
    expect(plan.upserts.map((x) => x.id)).toEqual(['b', 'c']);
    expect(plan.deletes).toEqual([]);
    const plan2 = diffForPush(shadow, [a], '2026-01-10');
    expect(plan2.upserts).toEqual([]);
    expect(plan2.deletes).toEqual([{ id: 'b', updatedAt: '2026-01-10' }]);
  });

  test('reconcilePush pushes local entities missing or newer remotely', () => {
    const local = [e('a', 'a', '2026-01-05'), e('b', 'b', '2026-01-01'), e('c', 'c', '2026-01-03'), e('d', 'd', '2026-01-09')];
    const remote: RemoteDoc<E>[] = [e('a', 'a', '2026-01-01'), e('b', 'b', '2026-01-02'), tomb('d', '2026-01-04')];
    expect(reconcilePush(local, remote).map((x) => x.id)).toEqual(['a', 'c', 'd']);
  });

  test('helpers', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(stripUndefined({ a: 1, b: undefined, c: null })).toEqual({ a: 1, c: null });
    expect(version(undefined) < version({ updatedAt: '2026-01-01' })).toBe(true);
  });
});
