/**
 * Middleware tenant routing — public whitelabel vs admin desk isolation.
 *
 * Public routes: hostname-resolved tenant only for nr-tenant-slug cookie.
 * Admin desk routes: no whitelabel cookie bootstrap (auth uses nr-dashboard-tenant).
 */

import {
  getDefaultTenant,
  getDefaultTenantSlug,
  getTenantByDomain,
  getTenantBySlug,
} from "@/lib/tenant/registry";
import type { TenantConfig } from "@/lib/tenant/types";

const ADMIN_DESK_PREFIXES = ["/admin", "/api/dashboard", "/api/auth"] as const;

function normalizeHost(host: string): string {
  return host.toLowerCase().split(":")[0].trim();
}

/** Admin console + dashboard auth APIs — isolated from public whitelabel routing */
export function isAdminDeskPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  return ADMIN_DESK_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Tenant resolved strictly from request hostname (no slug/env fallback) */
export function resolveTenantFromHost(host: string): TenantConfig | null {
  return getTenantByDomain(normalizeHost(host));
}

/** Public content tenant — hostname first, then configured default for RSC/header */
export function resolvePublicContentTenant(host: string): TenantConfig {
  return (
    resolveTenantFromHost(host) ??
    getTenantBySlug(getDefaultTenantSlug()) ??
    getDefaultTenant()
  );
}

/**
 * Write nr-tenant-slug only when hostname maps to a tenant preset/DB domain.
 * Never write default/fallback slug for anonymous visitors.
 */
export function shouldWriteWhitelabelTenantCookie(
  pathname: string,
  host: string
): boolean {
  if (isAdminDeskPath(pathname)) return false;
  return resolveTenantFromHost(host) !== null;
}

export function whitelabelTenantCookieSlug(host: string): string | null {
  return resolveTenantFromHost(host)?.slug ?? null;
}
