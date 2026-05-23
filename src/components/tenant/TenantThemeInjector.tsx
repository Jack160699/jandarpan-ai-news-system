import { buildTenantCssVariables } from "@/lib/tenant/theme";
import type { TenantConfig } from "@/lib/tenant/types";

export function TenantThemeInjector({ tenant }: { tenant: TenantConfig }) {
  const css = buildTenantCssVariables(tenant);

  return (
    <style
      id={`tenant-theme-${tenant.slug}`}
      data-tenant-theme={tenant.slug}
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
}
