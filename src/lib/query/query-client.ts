import { QueryClient } from "@tanstack/react-query";
import { tracePerf } from "@/lib/observability/performance-monitor";

const ADMIN_STALE_MS = 30_000;
const ADMIN_GC_MS = 5 * 60_000;

function createAdminQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: ADMIN_STALE_MS,
        gcTime: ADMIN_GC_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          if (failureCount >= 1) return false;
          const msg = error instanceof Error ? error.message : "";
          return msg !== "unauthorized";
        },
        retryDelay: 1_500,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let adminClient: QueryClient | null = null;

export function getAdminQueryClient(): QueryClient {
  if (!adminClient) {
    adminClient = createAdminQueryClient();
    tracePerf("QUERY", "admin_query_client_created");
  }
  return adminClient;
}

/** Public site may use a separate client later */
let publicClient: QueryClient | null = null;

export function getPublicQueryClient(): QueryClient {
  if (!publicClient) {
    publicClient = createAdminQueryClient();
    tracePerf("QUERY", "public_query_client_created");
  }
  return publicClient;
}

export function resetAdminQueryClient(): void {
  adminClient?.clear();
  adminClient = null;
}
