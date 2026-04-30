/**
 * Simple TTL-based in-memory cache
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const DEFAULT_TTL_MS = (parseInt(process.env.CACHE_TTL || "120", 10)) * 1000;

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { data, expiry: Date.now() + ttlMs });
}

export function cacheClear(): void {
  store.clear();
}

export function cacheSize(): number {
  return store.size;
}
