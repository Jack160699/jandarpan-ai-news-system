import { MonetizationProvider } from "@/providers/MonetizationProvider";
import { fetchMonetizationPayload } from "@/lib/monetization/fetch-payload";
import { getTenantConfig } from "@/lib/tenant/resolve";
import type { ReactNode } from "react";

export async function MonetizationRoot({ children }: { children: ReactNode }) {
  const tenant = await getTenantConfig();
  const payload = await fetchMonetizationPayload(tenant);

  if (!payload.settings.enabled) {
    return <>{children}</>;
  }

  return (
    <MonetizationProvider payload={payload}>{children}</MonetizationProvider>
  );
}
