"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { ADMIN_EMERGENCY_MOCK, isAdminEmergencyModeClient } from "@/lib/admin/emergency-mode";
import {
  canManageTeam,
  hasPermission as checkPermission,
  hasResolvedRole,
  isSuperAdmin as checkSuperAdmin,
} from "@/lib/auth/admin-permissions";
import { logAdminSession } from "@/lib/auth/admin-session-log";
import type { AdminSessionResponse, AdminSessionStatus } from "@/lib/auth/admin-session-types";
import type { DashboardPermission } from "@/lib/saas-auth/types";

export type AdminSessionContextValue = {
  status: AdminSessionStatus;
  session: AdminSessionResponse | null;
  authReady: boolean;
  roleResolved: boolean;
  isDegraded: boolean;
  isEmergency: boolean;
  userId: string | null;
  email: string;
  role: string;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string;
  permissions: DashboardPermission[];
  hasPermission: (permission: DashboardPermission) => boolean;
  isSuperAdmin: () => boolean;
  canManageTeam: () => boolean;
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

type AdminSessionProviderProps = {
  children: ReactNode;
  initialUser: User | null;
  initialSession?: AdminSessionResponse | null;
};

export function AdminSessionProvider({
  children,
  initialUser,
  initialSession = null,
}: AdminSessionProviderProps) {
  const isEmergency = isAdminEmergencyModeClient();
  const ssrRoleRef = useRef(initialSession?.membership?.role ?? null);

  const [session, setSession] = useState<AdminSessionResponse | null>(() => {
    if (isEmergency) return EMERGENCY_SESSION;
    if (initialSession?.membership?.role) return initialSession;
    return null;
  });

  const [status, setStatus] = useState<AdminSessionStatus>(() => {
    if (isEmergency) return "ready";
    if (initialSession?.membership?.role) return "ready";
    if (initialUser) return "loading";
    return "guest";
  });

  const fetchSession = useCallback(async (): Promise<AdminSessionResponse | null> => {
    const res = await fetch("/api/dashboard/auth/session", {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      logAdminSession("role_resolution_failed", {
        status: res.status,
        error: body.error ?? "unknown",
      });
      return null;
    }

    const data = (await res.json()) as AdminSessionResponse;
    if (!data.membership?.role) {
      logAdminSession("missing_membership", { reason: "api_response" });
      return null;
    }

    const ssrRole = ssrRoleRef.current;
    if (ssrRole && ssrRole !== data.membership.role) {
      logAdminSession("ssr_csr_role_mismatch", {
        ssrRole,
        clientRole: data.membership.role,
      });
    }

    return data;
  }, []);

  const refreshSession = useCallback(async () => {
    if (isEmergency) return;
    setStatus("loading");

    try {
      const recover = await fetch("/api/dashboard/auth/refresh-session", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      if (recover.ok) {
        const data = (await recover.json()) as AdminSessionResponse;
        if (data.membership?.role) {
          setSession(data);
          setStatus("ready");
          return;
        }
      }
    } catch {
      logAdminSession("session_error", { reason: "refresh_post_failed" });
    }

    const next = await fetchSession();
    if (next?.membership?.role) {
      setSession(next);
      setStatus("ready");
      return;
    }

    logAdminSession("session_error", {
      reason: "refresh_exhausted",
      userId: initialUser?.id,
    });
    setStatus(initialUser ? "session_error" : "error");
  }, [fetchSession, initialUser, isEmergency]);

  const invalidateSession = useCallback(() => {
    setSession(null);
    setStatus("guest");
  }, []);

  useEffect(() => {
    if (isEmergency || initialSession?.membership?.role) return;
    if (!initialUser) return;

    let cancelled = false;

    (async () => {
      const next = await fetchSession();
      if (cancelled) return;

      if (next?.membership?.role) {
        setSession(next);
        setStatus("ready");
        return;
      }

      logAdminSession("session_error", {
        reason: "client_hydration_failed",
        userId: initialUser.id,
        email: initialUser.email,
      });
      setStatus("session_error");
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchSession, initialSession?.membership?.role, initialUser, isEmergency]);

  const membership = session?.membership;
  const role = membership?.role ?? "";
  const permissions = session?.permissions ?? [];
  const roleResolved = hasResolvedRole({ authReady: status === "ready", role });
  const authReady = roleResolved;

  const permissionCtx = useMemo(
    () => ({ role, authReady, permissions }),
    [role, authReady, permissions]
  );

  const value = useMemo<AdminSessionContextValue>(() => {
    return {
      status,
      session,
      authReady,
      roleResolved,
      isDegraded: status === "session_error",
      isEmergency,
      userId: session?.user?.id ?? initialUser?.id ?? null,
      email: session?.user?.email ?? membership?.email ?? initialUser?.email ?? "",
      role,
      tenantId: membership?.tenantId ?? null,
      tenantSlug: membership?.tenantSlug ?? null,
      tenantName: membership?.tenantName ?? "Newsroom",
      permissions,
      hasPermission: (p) => checkPermission(permissionCtx, p),
      isSuperAdmin: () => checkSuperAdmin(role),
      canManageTeam: () => canManageTeam(permissionCtx),
      refreshSession,
      invalidateSession,
      clearStaleCookies: () => {},
    };
  }, [
    status,
    session,
    authReady,
    roleResolved,
    isEmergency,
    initialUser,
    membership,
    role,
    permissions,
    permissionCtx,
    refreshSession,
    invalidateSession,
  ]);

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
    roleResolved: boolean;
  }>
) {
  const session = useAdminSessionOptional();
  return {
    email: overrides?.email ?? session?.email ?? "",
    role: overrides?.role ?? session?.role ?? "",
    tenantName: overrides?.tenantName ?? session?.tenantName ?? "",
    authReady: overrides?.authReady ?? session?.authReady ?? false,
    roleResolved: overrides?.roleResolved ?? session?.roleResolved ?? false,
  };
}
