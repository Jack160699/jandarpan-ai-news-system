import type { TenantConfig } from "@/lib/tenant/types";

/** CSS custom properties injected per tenant */
export function buildTenantCssVariables(tenant: TenantConfig): string {
  const { theme, typography } = tenant;
  return `
:root, [data-tenant="${tenant.slug}"] {
  --tenant-slug: ${tenant.slug};
  --tenant-primary: ${theme.primary};
  --tenant-primary-dark: ${theme.primaryDark};
  --tenant-accent: ${theme.accent};
  --tenant-accent-soft: ${theme.accentSoft};
  --tenant-live: ${theme.live};
  --tenant-live-soft: ${theme.liveSoft};
  --tenant-surface: ${theme.surface};
  --tenant-ink: ${theme.ink};
  --ds-accent: ${theme.accent};
  --ds-accent-soft: ${theme.accentSoft};
  --ds-live: ${theme.live};
  --ds-live-soft: ${theme.liveSoft};
  --ds-surface: ${theme.surface};
  --ds-ink: ${theme.ink};
  --brand-maroon: ${theme.primary};
  --brand-maroon-deep: ${theme.primaryDark};
  --brand-orange: ${theme.accent};
  --accent-orange: ${theme.accent};
  --accent-live: ${theme.live};
  --font-display-name: ${typography.fontDisplay};
  --font-body-name: ${typography.fontBody};
}
`.trim();
}

export function tenantThemeColor(tenant: TenantConfig, mode: "light" | "dark"): string {
  return mode === "dark" ? tenant.theme.primaryDark : tenant.theme.surface;
}
