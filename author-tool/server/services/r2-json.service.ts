import { putObject, getObjectText, deleteObject } from './r2.service.js';
import { config } from '../config.js';

/**
 * Generic R2-backed JSON storage helpers.
 *
 * Single-writer model: these helpers assume one process writes at a time
 * (single Railway instance + single author-tool user + single cron). If you
 * ever run multiple writer instances against the same R2 key, add ETag-based
 * optimistic locking at the S3 API layer.
 */

export function isConfigured(): boolean {
  return !!(config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey);
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await getObjectText(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    const msg = (err as Error).message ?? '';
    // NoSuchKey / 404 → return fallback (first-time creation)
    if (msg.includes('NoSuchKey') || msg.includes('does not exist') || msg.includes('404')) {
      return fallback;
    }
    throw err;
  }
}

export async function writeJson<T>(key: string, data: T): Promise<void> {
  await putObject(key, JSON.stringify(data, null, 2), 'application/json');
}

export async function removeKey(key: string): Promise<void> {
  await deleteObject(key);
}

/**
 * In-memory write coalescing per key to avoid lost updates when multiple
 * async writes race within a single process.
 */
const writeLocks = new Map<string, Promise<unknown>>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeLocks.get(key);
  const next = (async () => {
    if (prev) {
      try { await prev; } catch { /* ignore previous error */ }
    }
    return fn();
  })();
  writeLocks.set(key, next);
  try {
    return await next;
  } finally {
    if (writeLocks.get(key) === next) writeLocks.delete(key);
  }
}

/**
 * Common list-of-items pattern: read JSON array, mutate, write back atomically
 * within this process.
 */
export async function mutateList<T>(
  key: string,
  mutate: (current: T[]) => T[] | Promise<T[]>
): Promise<T[]> {
  return withLock(key, async () => {
    const current = await readJson<T[]>(key, []);
    const next = await mutate(current);
    await writeJson(key, next);
    return next;
  });
}

export interface HasId { id: string }

export async function upsertById<T extends HasId>(
  key: string,
  item: T
): Promise<T[]> {
  return mutateList<T>(key, (list) => {
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      const next = list.slice();
      next[idx] = { ...next[idx], ...item };
      return next;
    }
    return [item, ...list];
  });
}

export async function removeById<T extends HasId>(
  key: string,
  id: string
): Promise<T[]> {
  return mutateList<T>(key, (list) => list.filter((x) => x.id !== id));
}

export async function patchById<T extends HasId>(
  key: string,
  id: string,
  patch: Partial<T>
): Promise<T | null> {
  let result: T | null = null;
  await mutateList<T>(key, (list) => {
    const idx = list.findIndex((x) => x.id === id);
    if (idx < 0) return list;
    const next = list.slice();
    next[idx] = { ...next[idx], ...patch };
    result = next[idx];
    return next;
  });
  return result;
}
