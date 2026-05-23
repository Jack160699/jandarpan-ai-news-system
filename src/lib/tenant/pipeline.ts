import { getDefaultTenant } from "@/lib/tenant/registry";

/** Active tenant UUID for ingestion / generation (env-driven default slug). */
export function getPipelineTenantId(): string {
  return getDefaultTenant().id;
}
