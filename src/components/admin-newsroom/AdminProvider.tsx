"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";
import { traceAdminEmergency } from "@/lib/admin/emergency-mode";
import { apiClient } from "@/lib/api/api-client";
import { tracePerf } from "@/lib/observability/performance-monitor";
import { fetchEditorialDashboard } from "@/lib/query/dashboard-fetch";
import { useEditorialDashboardQuery } from "@/lib/query/hooks/use-editorial-dashboard";
import { queryKeys } from "@/lib/query/query-keys";
import { useAdminIdentity } from "@/providers/AdminSessionProvider";

type Theme = "dark" | "light";

type AdminContextValue = {
  email: string;
  role: string;
  tenantName: string;
  data: EditorialDashboardSnapshot | null;
  error: string | null;
  loading: boolean;
  theme: Theme;
  setTheme: (t: Theme) => void;
  refresh: () => Promise<void>;
  runAction: (
    action: string,
    payload: Record<string, string | number | boolean | undefined>,
    options?: {
      optimistic?: (
        prev: EditorialDashboardSnapshot
      ) => EditorialDashboardSnapshot;
    }
  ) => Promise<boolean>;
  busyId: string | null;
  toast: string | null;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdminNewsroom(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdminNewsroom must be used within AdminProvider");
  return ctx;
}

type AdminProviderProps = {
  children: React.ReactNode;
  email?: string;
  role?: string;
  tenantName?: string;
  emergencyMode?: boolean;
  authReady?: boolean;
};

export function AdminProvider({
  children,
  email: emailProp,
  role: roleProp,
  tenantName: tenantNameProp,
  emergencyMode = false,
  authReady: authReadyProp,
}: AdminProviderProps) {
  const identity = useAdminIdentity({
    email: emailProp,
    role: roleProp,
    tenantName: tenantNameProp,
    authReady: authReadyProp,
  });
  const { email, role, tenantName, authReady } = identity;

  const queryClient = useQueryClient();
  const dashboardQuery = useEditorialDashboardQuery(authReady && !emergencyMode);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("anr-theme") as Theme | null;
    if (stored === "light" || stored === "dark") setThemeState(stored);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("anr-theme", t);
  }, []);

  const refresh = useCallback(async () => {
    tracePerf("QUERY", "dashboard_manual_refresh");
    await queryClient.fetchQuery({
      queryKey: queryKeys.editorial.dashboard,
      queryFn: () => fetchEditorialDashboard({ force: true, reason: "manual" }),
      staleTime: 0,
    });
  }, [queryClient]);

  const actionMutation = useMutation({
    mutationFn: async (input: {
      action: string;
      payload: Record<string, string | number | boolean | undefined>;
    }) => {
      const result = await apiClient.post<{
        ok: boolean;
        message?: string;
        error?: string;
        snapshot?: EditorialDashboardSnapshot;
      }>("/api/editorial/actions", { action: input.action, ...input.payload }, {
        label: "editorial_action",
      });
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (json) => {
      if (json.snapshot) {
        queryClient.setQueryData(queryKeys.editorial.dashboard, json.snapshot);
      }
    },
  });

  const runAction = useCallback(
    async (
      action: string,
      payload: Record<string, string | number | boolean | undefined>,
      options?: {
        optimistic?: (
          prev: EditorialDashboardSnapshot
        ) => EditorialDashboardSnapshot;
      }
    ): Promise<boolean> => {
      const busyKey = `${action}-${payload.articleId ?? payload.sourceId ?? ""}`;
      setBusyId(busyKey);

      if (options?.optimistic && dashboardQuery.data) {
        queryClient.setQueryData(
          queryKeys.editorial.dashboard,
          options.optimistic(dashboardQuery.data)
        );
      }

      try {
        const json = await actionMutation.mutateAsync({ action, payload });
        if (!json.ok) {
          await refresh();
          return false;
        }
        setToast(json.message ?? "Saved");
        window.setTimeout(() => setToast(null), 2400);
        return true;
      } catch {
        await refresh();
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [actionMutation, dashboardQuery.data, queryClient, refresh]
  );

  const error = useMemo(() => {
    if (emergencyMode) return "Recovery mode: workspace data loads on demand.";
    if (dashboardQuery.isError) {
      const msg =
        dashboardQuery.error instanceof Error
          ? dashboardQuery.error.message
          : "Failed to load dashboard";
      if (msg === "timeout") {
        return "Dashboard load timed out. Editorial tools remain available in degraded mode.";
      }
      return msg;
    }
    return null;
  }, [emergencyMode, dashboardQuery.isError, dashboardQuery.error]);

  useEffect(() => {
    if (emergencyMode) {
      traceAdminEmergency("CLIENT_HYDRATION", "provider_emergency_skip_fetch");
    }
  }, [emergencyMode]);

  const dashboardData = dashboardQuery.data ?? null;
  const dashboardLoading = dashboardQuery.isLoading && !dashboardData;

  const value = useMemo(
    () => ({
      email,
      role,
      tenantName,
      data: dashboardData,
      error,
      loading: dashboardLoading,
      theme,
      setTheme,
      refresh,
      runAction,
      busyId,
      toast,
    }),
    [
      email,
      role,
      tenantName,
      dashboardData,
      dashboardLoading,
      error,
      theme,
      setTheme,
      refresh,
      runAction,
      busyId,
      toast,
    ]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
