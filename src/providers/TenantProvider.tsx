"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { TenantConfig } from "@/lib/tenant/types";
import { buildNavCategories, buildHeaderLocation } from "@/lib/tenant/navigation";
import type { NavCategory } from "@/lib/navigation";

type TenantContextValue = {
  tenant: TenantConfig;
  navCategories: NavCategory[];
  headerLocation: ReturnType<typeof buildHeaderLocation>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantConfig;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      tenant,
      navCategories: buildNavCategories(tenant),
      headerLocation: buildHeaderLocation(tenant),
    }),
    [tenant]
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return ctx;
}

export function useTenantOptional() {
  return useContext(TenantContext);
}
