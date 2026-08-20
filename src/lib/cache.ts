import { cached, getMemoryCache } from "@/lib/memory-cache";

/** Cache key namespaces for listings and related public reads. */
export const CacheKeys = {
  propertyList: (query: string) => `properties:list:${query}`,
  propertyDetail: (idOrSlug: string) => `properties:detail:${idOrSlug}`,
  userAuthSnapshot: (userId: string) => `auth:user:${userId}`,
} as const;

export const CacheTTL = {
  /** Public property search/list — short TTL for freshness */
  propertyListMs: Number.parseInt(process.env.CACHE_PROPERTIES_TTL_MS || "45000", 10) || 45_000,
  /** Property detail pages */
  propertyDetailMs: Number.parseInt(process.env.CACHE_PROPERTY_DETAIL_TTL_MS || "60000", 10) || 60_000,
  /** Auth role/status snapshot used in JWT refresh */
  authUserMs: Number.parseInt(process.env.CACHE_AUTH_USER_TTL_MS || "30000", 10) || 30_000,
} as const;

export async function cachePropertyList<T>(
  queryKey: string,
  loader: () => Promise<T>
): Promise<{ data: T; cache: "HIT" | "MISS" }> {
  return cached(CacheKeys.propertyList(queryKey), loader, CacheTTL.propertyListMs);
}

export async function cachePropertyDetail<T>(
  idOrSlug: string,
  loader: () => Promise<T>
): Promise<{ data: T; cache: "HIT" | "MISS" }> {
  return cached(CacheKeys.propertyDetail(idOrSlug), loader, CacheTTL.propertyDetailMs);
}

export async function cacheAuthUser<T>(
  userId: string,
  loader: () => Promise<T>
): Promise<T> {
  const { data } = await cached(
    CacheKeys.userAuthSnapshot(userId),
    loader,
    CacheTTL.authUserMs
  );
  return data;
}

/** Drop listing/detail caches after create/update/delete. */
export function invalidatePropertyCaches(propertyId?: string, slug?: string): void {
  const cache = getMemoryCache();
  cache.invalidatePrefix("properties:list:");
  if (propertyId) cache.delete(CacheKeys.propertyDetail(propertyId));
  if (slug) cache.delete(CacheKeys.propertyDetail(slug));
}

export function invalidateAuthUserCache(userId: string): void {
  getMemoryCache().delete(CacheKeys.userAuthSnapshot(userId));
}

export function getCacheStats() {
  return getMemoryCache().stats();
}
