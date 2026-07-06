import { MonetizationRoot } from "@/components/monetization/MonetizationRoot";
import { TenantThemeInjector } from "@/components/tenant/TenantThemeInjector";
import { TenantJsonLd } from "@/components/tenant/TenantJsonLd";
import { OrganizationProvider } from "@/providers/OrganizationProvider";
import { TenantProvider } from "@/providers/TenantProvider";
import type { OrganizationSettings } from "@/lib/organization/types";
import type { TenantConfig } from "@/lib/tenant/types";
import type { ReactNode } from "react";

export function TenantRoot({
  tenant,
  organization,
  children,
}: {
  tenant: TenantConfig;
  organization: OrganizationSettings;
  children: ReactNode;
}) {
  return (
    <>
      <TenantThemeInjector tenant={tenant} />
      <TenantJsonLd tenant={tenant} organization={organization} />
      <TenantProvider tenant={tenant}>
        <OrganizationProvider settings={organization}>
          <MonetizationRoot>{children}</MonetizationRoot>
        </OrganizationProvider>
      </TenantProvider>
    </>
  );
}
