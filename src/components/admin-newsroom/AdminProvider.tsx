"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";
import { traceAdminEmergency } from "@/lib/admin/emergency-mode";
import { traceAdminBoot } from "@/lib/observability/admin-boot";
import { traceStability } from "@/lib/observability/stability-trace";
import { isTimeoutError, withTimeout } from "@/lib/utils/withTimeout";

/** Hobby-safe admin dashboard polling (default 60s) */
const POLL_MS = Number(process.env.NEXT_PUBLIC_ADMIN_POLL_MS) || 60_000;

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
    options?: { optimistic?: (prev: EditorialDashboardSnapshot) => EditorialDashboardSnapshot }
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
  /** Skip dashboard preload — emergency recovery */
  emergencyMode?: boolean;
  /** When false, shell renders but workspace fetch waits for client auth */
  authReady?: boolean;
};

export function AdminProvider({
  children,
  email = "",
  role = "",
  tenantName = "",
  emergencyMode = false,
  authReady = true,
}: AdminProviderProps) {
  const [data, setData] = useState<EditorialDashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(
    emergencyMode
      ? "Recovery mode: workspace data loads on demand."
      : null
  );
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setThemeState] = useState<Theme>("dark");
  const inFlightRef = useRef<AbortController | null>(null);
  const lastFetchAtRef = useRef<number>(0);

  useEffect(() => {
    const stored = localStorage.getItem("anr-theme") as Theme | null;
    if (stored === "light" || stored === "dark") setThemeState(stored);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("anr-theme", t);
  }, []);

  const refresh = useCallback(async () => {
    if (!authReady && !emergencyMode) return;
    if (inFlightRef.current) {
      traceAdminBoot("WORKSPACE_LOAD", "dashboard_fetch_dedup_in_flight");
      traceStability("RENDER_LOOP", "admin_provider_refresh_dedupe");
      return;
    }

    const startedAt = Date.now();
    lastFetchAtRef.current = startedAt;
    const controller = new AbortController();
    inFlightRef.current = controller;
    traceAdminBoot("WORKSPACE_LOAD", "dashboard_fetch_start");
    traceStability("SESSION_REFRESH", "admin_dashboard_fetch_start");
    setLoading(true);
    try {
      const res = await withTimeout(
        fetch("/api/editorial/dashboard", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        }),
        { label: "WORKSPACE_LOAD", timeoutMs: 8_000 }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load dashboard");
        return;
      }
      setData(json as EditorialDashboardSnapshot);
      setError(null);
    } catch (err) {
      if (isTimeoutError(err)) {
        setError(
          "Dashboard load timed out. Editorial tools remain available in degraded mode."
        );
      } else if (err instanceof DOMException && err.name === "AbortError") {
        traceAdminBoot("WORKSPACE_LOAD", "dashboard_fetch_aborted");
        traceStability("SESSION_REFRESH", "admin_dashboard_fetch_aborted");
      } else {
        setError("Network error");
      }
    } finally {
      setLoading(false);
      if (inFlightRef.current === controller) inFlightRef.current = null;
      traceAdminBoot("WORKSPACE_LOAD", "dashboard_fetch_done", {
        ms: Date.now() - startedAt,
      });
      traceStability("SESSION_REFRESH", "admin_dashboard_fetch_done", {
        ms: Date.now() - startedAt,
      });
    }
  }, [authReady, emergencyMode]);

  useEffect(() => {
    if (emergencyMode) {
      traceAdminEmergency("CLIENT_HYDRATION", "provider_emergency_skip_fetch");
      setLoading(false);
      return;
    }
    if (!authReady) return;
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh, emergencyMode, authReady]);

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

      if (options?.optimistic && data) {
        setData(options.optimistic(data));
      }

      try {
        const res = await fetch("/api/editorial/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action, ...payload }),
        });
        const json = await res.json();
        if (!json.ok) {
          setError(json.message ?? json.error ?? "Action failed");
          await refresh();
          return false;
        }
        setToast(json.message ?? "Saved");
        setTimeout(() => setToast(null), 2400);
        await refresh();
        return true;
      } catch {
        setError("Network error");
        await refresh();
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [data, refresh]
  );

  const value = useMemo(
    () => ({
      email,
      role,
      tenantName,
      data,
      error,
      loading,
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
      data,
      error,
      loading,
      theme,
      setTheme,
      refresh,
      runAction,
      busyId,
      toast,
    ]
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}
