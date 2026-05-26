"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ADMIN_EMERGENCY_MOCK,
  isAdminEmergencyModeClient,
} from "@/lib/admin/emergency-mode";
import type {
  AdminSessionResponse,
  AdminSessionStatus,
} from "@/lib/auth/admin-session-types";
import { staleAuthCookieHints } from "@/lib/auth/auth-safe";
import { tracePerf, traceDegraded } from "@/lib/observability/performance-monitor";
import { useAdminSessionQuery } from "@/lib/query/hooks/use-admin-session-query";
import { queryKeys } from "@/lib/query/query-keys";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import type { DashboardPermission } from "@/lib/saas-auth/types";

export type AdminSessionContextValue = {
  status: AdminSessionStatus;
  session: AdminSessionResponse | null;
  authReady: boolean;
  isDegraded: boolean;
  isEmergency: boolean;
  userId: string | null;
  email: string;
  role: string;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string;
  permissions: DashboardPermission[];
  hasPermission: (p: DashboardPermission) => boolean;
  refreshSession: () => Promise<void>;
  invalidateSession: () => void;
  clearStaleCookies: () => void;
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

const EMERGENCY_SESSION: AdminSessionResponse = {
  ok: true,
  user: { id: "emergency", email: ADMIN_EMERGENCY_MOCK.email },
  membership: {
    id: "emergency",
    tenantId: "emergency",
    tenantSlug: "jan-darpan",
    tenantName: ADMIN_EMERGENCY_MOCK.tenantName,
    userId: "emergency",
    email: ADMIN_EMERGENCY_MOCK.email,
    role: "super_admin",
    status: "active",
  },
  permissions: [
    "analytics:read",
    "content:read",
    "content:write",
    "editorial:write",
    "publish:write",
    "team:read",
    "team:write",
    "billing:read",
    "billing:write",
    "monitoring:read",
    "providers:read",
  ],
};

function resolveStatus(
  emergency: boolean,
  query: ReturnType<typeof useAdminSessionQuery>
): AdminSessionStatus {
  if (emergency) return "ready";
  if (query.isLoading && !query.data) return "loading";
  if (query.isError) return "error";
  const data = query.data;
  if (!data) return "loading";
  if (!data.ok) {
    if (data.error === "timeout") return "degraded";
    return "guest";
  }
  if (!data.membership) return "guest";
  return "ready";
}

type AdminSessionProviderProps = {
  children: ReactNode;
};

export function AdminSessionProvider({ children }: AdminSessionProviderProps) {
  const queryClient = useQueryClient();
  const isEmergency = isAdminEmergencyModeClient();
  const sessionQuery = useAdminSessionQuery(!isEmergency);

  const session = isEmergency
    ? EMERGENCY_SESSION
    : sessionQuery.data ?? null;

  const status = resolveStatus(isEmergency, sessionQuery);
  const authReady = status === "ready" || status === "degraded";
  const isDegraded = status === "degraded";

  if (isDegraded) {
    traceDegraded("auth", "session_timeout");
  }

  const membership = session?.membership;
  const permissions = session?.permissions ?? [];

  const refreshSession = useCallback(async () => {
    tracePerf("AUTH", "session_manual_refresh");
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.session });
    await sessionQuery.refetch();
  }, [queryClient, sessionQuery]);

  const invalidateSession = useCallback(() => {
    tracePerf("AUTH", "session_invalidate");
    queryClient.setQueryData(queryKeys.admin.session, {
      ok: false,
      error: "unauthorized",
    });
  }, [queryClient]);

  const clearStaleCookies = useCallback(() => {
    tracePerf("AUTH", "stale_cookie_cleanup_hint");
    for (const name of staleAuthCookieHints()) {
      document.cookie = `${name}=; path=/; max-age=0`;
    }
  }, []);

  const hasPermission = useCallback(
    (p: DashboardPermission) => {
      if (!membership?.role) return false;
      return roleHasPermission(membership.role, p);
    },
    [membership?.role]
  );

  const value = useMemo<AdminSessionContextValue>(
    () => ({
      status,
      session,
      authReady,
      isDegraded,
      isEmergency,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? membership?.email ?? "",
      role: membership?.role ?? "editor",
      tenantId: membership?.tenantId ?? null,
      tenantSlug: membership?.tenantSlug ?? null,
      tenantName: membership?.tenantName ?? "Newsroom",
      permissions,
      hasPermission,
      refreshSession,
      invalidateSession,
      clearStaleCookies,
    }),
    [
      status,
      session,
      authReady,
      isDegraded,
      isEmergency,
      membership,
      permissions,
      hasPermission,
      refreshSession,
      invalidateSession,
      clearStaleCookies,
    ]
  );

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminSessionContextValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminSession must be used within AdminSessionProvider");
  }
  return ctx;
}

export function useAdminSessionOptional(): AdminSessionContextValue | null {
  return useContext(AdminSessionContext);
}

/** Props override optional session context (emergency bootstrap). */
export function useAdminIdentity(
  overrides?: Partial<{
    email: string;
    role: string;
    tenantName: string;
    authReady: boolean;
  }>
) {
  const session = useAdminSessionOptional();
  return {
    email: overrides?.email ?? session?.email ?? "",
    role: overrides?.role ?? session?.role ?? "",
    tenantName: overrides?.tenantName ?? session?.tenantName ?? "",
    authReady: overrides?.authReady ?? session?.authReady ?? true,
  };
}
