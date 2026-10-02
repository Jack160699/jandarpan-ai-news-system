/**
 * Supabase Edge implementation of src/lib/infrastructure/cache/shared-read-cache.ts (swapped in at bundle time).
 * next/cache does not exist in the Edge runtime and the workers must always read fresh data, so this is a pass-through.
 */

export type CachedReadOptions = { ttlSeconds: number; tags?: string[] };

export function clearSharedReadMemo(): void {}

export async function cachedRead<T>(_keyParts: string[], _options: CachedReadOptions, loader: () => Promise<T>): Promise<T> {
  return loader();
}
