"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  EditorialDeskContext,
  type EditorialDeskContextValue,
} from "@/providers/EditorialDeskContext";
import type { SaasDashboardSnapshot } from "@/lib/dashboard/types";

const POLL_MS = 15_000;

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SaasDashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("saas-dash-theme") as "dark" | "light" | null;
    if (stored === "light" || stored === "dark") setThemeState(stored);
  }, []);

  const setTheme = useCallback((t: "dark" | "light") => {
    setThemeState(t);
    localStorage.setItem("saas-dash-theme", t);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/dashboard/auth/session", {
        credentials: "include",
      });
      if (!sessionRes.ok) {
        setError("Session expired");
        return;
      }
      const sessionJson = await sessionRes.json();
      setRole(sessionJson.membership?.role ?? null);

      const res = await fetch("/api/dashboard/snapshot", {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load dashboard");
        return;
      }
      setData(json as SaasDashboardSnapshot);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const runAction = useCallback(
    async (
      action: string,
      payload: Record<string, string | number | boolean | undefined>,
      options?: {
        optimistic?: (prev: SaasDashboardSnapshot) => SaasDashboardSnapshot;
      }
    ): Promise<boolean> => {
      const id = (payload.articleId as string) ?? action;
      setBusyId(id);
      if (data && options?.optimistic) {
        setData(options.optimistic(data));
      }

      try {
        const res = await fetch("/api/dashboard/actions", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        });
        const json = await res.json();
        if (!json.ok) {
          setToast(json.message ?? json.error ?? "Action failed");
          await refresh();
          return false;
        }
        setToast(`${action} completed`);
        await refresh();
        return true;
      } catch {
        setToast("Network error");
        await refresh();
        return false;
      } finally {
        setBusyId(null);
        setTimeout(() => setToast(null), 3200);
      }
    },
    [data, refresh]
  );

  const logout = useCallback(async () => {
    await fetch("/api/dashboard/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/dashboard/login";
  }, []);

  const value = useMemo<EditorialDeskContextValue>(
    () => ({
      data,
      error,
      loading,
      theme,
      setTheme,
      refresh,
      runAction,
      busyId,
      toast,
      logout,
      membership: data?.tenant ?? null,
      role,
    }),
    [data, error, loading, theme, setTheme, refresh, runAction, busyId, toast, logout, role]
  );

  return (
    <EditorialDeskContext.Provider value={value}>
      {children}
    </EditorialDeskContext.Provider>
  );
}
