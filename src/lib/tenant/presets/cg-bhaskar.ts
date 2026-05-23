/**
 * @deprecated Legacy slug — same product as Hamar Chhattisgarh
 * Kept for existing links and env NEWSROOM_DEFAULT_TENANT=cg-bhaskar
 */
import { HAMAR_CHHATTISGARH_TENANT } from "@/lib/tenant/presets/hamar-chhattisgarh";
import type { TenantConfig } from "@/lib/tenant/types";

export const CG_BHASKAR_TENANT: TenantConfig = {
  ...HAMAR_CHHATTISGARH_TENANT,
  slug: "cg-bhaskar",
  id: "00000000-0000-4000-8000-000000000001",
};
