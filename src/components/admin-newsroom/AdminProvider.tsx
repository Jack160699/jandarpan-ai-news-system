"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";

const POLL_MS = 12_000;

type Theme = "dark" | "light";

type AdminContextValue = {
  adminKey: string;
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
  adminKey: string;
  children: React.ReactNode;
};

export function AdminProvider({ adminKey, children }: AdminProviderProps) {
  const [data, setData] = useState<EditorialDashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
    try {
      const res = await fetch(
        `/api/editorial/dashboard?key=${encodeURIComponent(adminKey)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load dashboard");
        return;
      }
      setData(json as EditorialDashboardSnapshot);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

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
        const res = await fetch(
          `/api/editorial/actions?key=${encodeURIComponent(adminKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, ...payload }),
          }
        );
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
    [adminKey, data, refresh]
  );

  const value = useMemo(
    () => ({
      adminKey,
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
    [adminKey, data, error, loading, theme, setTheme, refresh, runAction, busyId, toast]
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}
