/**
 * @deprecated Legacy slug — same product as Jan Darpan Chhattisgarh
 */
import { JAN_DARPAN_CHHATTISGARH_TENANT } from "@/lib/tenant/presets/jan-darpan-chhattisgarh";
import type { TenantConfig } from "@/lib/tenant/types";

export const CG_BHASKAR_TENANT: TenantConfig = {
  ...JAN_DARPAN_CHHATTISGARH_TENANT,
  slug: "cg-bhaskar",
  id: "00000000-0000-4000-8000-000000000001",
};
