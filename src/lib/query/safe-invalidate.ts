import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { traceRemount } from "@/lib/observability/remount-trace";

/**
 * Narrow invalidation — never pass unscoped partial keys that match the whole tree.
 */
export function invalidateQueryKey(
  queryClient: QueryClient,
  queryKey: QueryKey,
  reason: string
): Promise<void> {
  traceRemount("QUERY_INVALIDATION", reason, { queryKey });
  return queryClient.invalidateQueries({
    queryKey,
    exact: true,
  });
}

export function patchQueryData<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (prev: T | undefined) => T
): void {
  queryClient.setQueryData<T>(queryKey, updater);
}
