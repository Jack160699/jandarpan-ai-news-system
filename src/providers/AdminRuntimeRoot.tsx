"use client";

/**
 * Isolated admin runtime — separate QueryClient + session from public site.
 */

import { type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { QueryClientProvider } from "@tanstack/react-query";
import { getAdminQueryClient } from "@/lib/query/query-client";
import { useRemountTrace } from "@/hooks/useRemountTrace";
import { tracePerf } from "@/lib/observability/performance-monitor";
import { AdminWorkspaceProvider } from "@/components/admin-newsroom/AdminWorkspaceProvider";
import type { AdminSessionResponse } from "@/lib/auth/admin-session-types";
import { AdminSessionProvider } from "@/providers/AdminSessionProvider";

type AdminRuntimeRootProps = {
  children: ReactNode;
  initialUser: User | null;
  initialSession?: AdminSessionResponse | null;
};

const adminQueryClient = getAdminQueryClient();

export function AdminRuntimeRoot({
  children,
  initialUser,
  initialSession = null,
}: AdminRuntimeRootProps) {
  useRemountTrace("AdminRuntimeRoot", "ROOT_REMOUNT");
  tracePerf("PROVIDER", "admin_runtime_mount");

  return (
    <div className="anr-runtime" data-runtime="admin">
      <QueryClientProvider client={adminQueryClient}>
        <AdminSessionProvider
          initialUser={initialUser}
          initialSession={initialSession}
        >
          <AdminWorkspaceProvider>{children}</AdminWorkspaceProvider>
        </AdminSessionProvider>
      </QueryClientProvider>
    </div>
  );
}
