type CacheStorageLike = Pick<CacheStorage, "keys" | "delete">;

/**
 * Removes both the previous next-pwa default caches and any future app
 * caches. Cache Storage is origin-scoped, so clearing all entries here cannot
 * affect another website.
 */
export async function clearInventoryCaches(cacheStorage?: CacheStorageLike): Promise<number> {
  const storage = cacheStorage ?? (typeof caches === "undefined" ? undefined : caches);
  if (!storage) return 0;

  const names = await storage.keys();
  const results = await Promise.all(names.map((name) => storage.delete(name)));
  return results.filter(Boolean).length;
}

