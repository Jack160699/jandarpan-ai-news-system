"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { ADMIN_EMERGENCY_MOCK, isAdminEmergencyModeClient } from "@/lib/admin/emergency-mode";
import type { AdminSessionResponse, AdminSessionStatus } from "@/lib/auth/admin-session-types";
import type { DashboardPermission } from "@/lib/saas-auth/types";

export type AdminSessionContextValue = {
  status: AdminSessionStatus;
  session: AdminSessionResponse | null;
  authReady: boolean;
  isDegraded: false;
  isEmergency: boolean;
  userId: string | null;
  email: string;
  role: string;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string;
  permissions: DashboardPermission[];
  hasPermission: (_p: DashboardPermission) => boolean;
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
};

export function AdminSessionProvider({ children, initialUser }: AdminSessionProviderProps) {
  const isEmergency = isAdminEmergencyModeClient();
  const status: AdminSessionStatus = isEmergency || initialUser ? "ready" : "guest";
  const authReady = status === "ready";

  const value = useMemo<AdminSessionContextValue>(() => {
    const session: AdminSessionResponse | null = isEmergency
      ? EMERGENCY_SESSION
      : initialUser
        ? {
            ok: true,
            user: {
              id: initialUser.id,
              email: initialUser.email ?? "",
            },
          }
        : null;
    const membership = session?.membership;
    const permissions = session?.permissions ?? [];
    return {
      status,
      session,
      authReady,
      isDegraded: false,
      isEmergency,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? membership?.email ?? "",
      role: membership?.role ?? "editor",
      tenantId: membership?.tenantId ?? null,
      tenantSlug: membership?.tenantSlug ?? null,
      tenantName: membership?.tenantName ?? "Newsroom",
      permissions,
      hasPermission: () => false,
      refreshSession: async () => {},
      invalidateSession: () => {},
      clearStaleCookies: () => {},
    };
  }, [
    status,
    authReady,
    isEmergency,
    initialUser,
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
