/**
 * Zero-cost in-process memory cache (LRU + TTL).
 * No Redis, no SaaS, no account — lives in the Node process / warm serverless isolate.
 */

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxEntries: number;
  evictions: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const globalForCache = globalThis as unknown as {
  __rentmeMemoryCache?: MemoryCache;
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value || "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(maxEntries?: number) {
    this.maxEntries = maxEntries ?? parsePositiveInt(process.env.CACHE_MAX_ENTRIES, 500);
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }

    // Refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits += 1;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl =
      ttlMs ??
      parsePositiveInt(process.env.CACHE_TTL_MS, 60_000);

    if (this.store.has(key)) {
      this.store.delete(key);
    }

    while (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.store.delete(oldest);
      this.evictions += 1;
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /** Delete every key that starts with the given prefix. */
  invalidatePrefix(prefix: string): number {
    let removed = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear(): void {
    this.store.clear();
  }

  stats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size,
      maxEntries: this.maxEntries,
      evictions: this.evictions,
    };
  }
}

export function getMemoryCache(): MemoryCache {
  if (!globalForCache.__rentmeMemoryCache) {
    globalForCache.__rentmeMemoryCache = new MemoryCache();
  }
  return globalForCache.__rentmeMemoryCache;
}

export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs?: number
): Promise<{ data: T; cache: "HIT" | "MISS" }> {
  const cache = getMemoryCache();
  const hit = cache.get<T>(key);
  if (hit !== undefined) {
    return { data: hit, cache: "HIT" };
  }

  const data = await loader();
  cache.set(key, data, ttlMs);
  return { data, cache: "MISS" };
}
