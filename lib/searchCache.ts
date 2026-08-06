type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const MAX_CACHE = 500;
const cache = new Map<string, CacheEntry<unknown>>();

export const getCached = <T>(key: string): T | null => {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  // Refresh insertion order for LRU
  cache.delete(key);
  cache.set(key, entry);
  return entry.data as T;
};

export const setCached = <T>(key: string, data: T, ttlMs: number) => {
  const now = Date.now();
  if (cache.size >= MAX_CACHE) {
    for (const [k, e] of cache.entries()) {
      if (e.expiresAt <= now) {
        cache.delete(k);
      }
    }
    if (cache.size >= MAX_CACHE) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }
  }
  cache.set(key, { data, expiresAt: now + ttlMs });
};
