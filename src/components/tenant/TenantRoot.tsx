import { MonetizationRoot } from "@/components/monetization/MonetizationRoot";
import { TenantThemeInjector } from "@/components/tenant/TenantThemeInjector";
import { TenantJsonLd } from "@/components/tenant/TenantJsonLd";
import { TenantProvider } from "@/providers/TenantProvider";
import type { TenantConfig } from "@/lib/tenant/types";
import type { ReactNode } from "react";

export function TenantRoot({
  tenant,
  children,
}: {
  tenant: TenantConfig;
  children: ReactNode;
}) {
  return (
    <>
      <TenantThemeInjector tenant={tenant} />
      <TenantJsonLd tenant={tenant} />
      <TenantProvider tenant={tenant}>
        <MonetizationRoot>{children}</MonetizationRoot>
      </TenantProvider>
    </>
  );
}
