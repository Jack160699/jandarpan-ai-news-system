"use client";

/**
 * Isolated admin runtime — separate QueryClient + session from public site.
 */

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getAdminQueryClient } from "@/lib/query/query-client";
import { tracePerf } from "@/lib/observability/performance-monitor";
import { AdminSessionProvider } from "@/providers/AdminSessionProvider";

type AdminRuntimeRootProps = {
  children: ReactNode;
};

export function AdminRuntimeRoot({ children }: AdminRuntimeRootProps) {
  const [client] = useState(() => {
    tracePerf("PROVIDER", "admin_runtime_mount");
    return getAdminQueryClient();
  });

  return (
    <div className="anr-runtime" data-runtime="admin">
      <QueryClientProvider client={client}>
        <AdminSessionProvider>{children}</AdminSessionProvider>
      </QueryClientProvider>
    </div>
  );
}
