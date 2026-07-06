"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { OrganizationSettings } from "@/lib/organization/types";

const OrganizationContext = createContext<OrganizationSettings | null>(null);

export function OrganizationProvider({
  settings,
  children,
}: {
  settings: OrganizationSettings;
  children: ReactNode;
}) {
  const value = useMemo(() => settings, [settings]);
  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return ctx;
}

export function useOrganizationOptional() {
  return useContext(OrganizationContext);
}
