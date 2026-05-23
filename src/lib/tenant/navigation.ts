import type { NavCategory } from "@/lib/navigation";
import type { TenantConfig } from "@/lib/tenant/types";

export function buildNavCategories(tenant: TenantConfig): NavCategory[] {
  return [...tenant.categories]
    .sort((a, b) => a.navOrder - b.navOrder)
    .map((c) => ({
      id: c.id,
      label: c.label,
      labelHi: c.labelHi,
      href: c.href,
    }));
}

export function buildHeaderLocation(tenant: TenantConfig) {
  return {
    city: tenant.newsroom.headerCity,
    cityHi: tenant.newsroom.headerCityHi,
    temp: "",
    condition: tenant.newsroom.editionLabel ?? "",
  };
}
