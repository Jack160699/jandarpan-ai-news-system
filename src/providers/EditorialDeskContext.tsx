"use client";

import { createContext, useContext } from "react";
import type { SaasDashboardSnapshot } from "@/lib/dashboard/types";

export type EditorialDeskContextValue = {
  data: SaasDashboardSnapshot | null;
  error: string | null;
  loading: boolean;
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  refresh: () => Promise<void>;
  runAction: (
    action: string,
    payload: Record<string, string | number | boolean | undefined>,
    options?: {
      optimistic?: (prev: SaasDashboardSnapshot) => SaasDashboardSnapshot;
    }
  ) => Promise<boolean>;
  busyId: string | null;
  toast: string | null;
  logout: () => Promise<void>;
  membership: SaasDashboardSnapshot["tenant"] | null;
  role: string | null;
};

export const EditorialDeskContext =
  createContext<EditorialDeskContextValue | null>(null);

export function useEditorialDesk(): EditorialDeskContextValue {
  const ctx = useContext(EditorialDeskContext);
  if (!ctx) {
    throw new Error("useEditorialDesk must be used within DashboardProvider");
  }
  return ctx;
}
