/**
 * @deprecated Legacy slug — redirects to Jan Darpan Chhattisgarh
 */
import { JAN_DARPAN_CHHATTISGARH_TENANT } from "@/lib/tenant/presets/jan-darpan-chhattisgarh";
import type { TenantConfig } from "@/lib/tenant/types";

export const HAMAR_CHHATTISGARH_TENANT: TenantConfig = {
  ...JAN_DARPAN_CHHATTISGARH_TENANT,
  slug: "hamar-chhattisgarh",
  id: "00000000-0000-4000-8000-000000000002",
  /** Legacy slug only — do not inherit host routing from Jan Darpan preset */
  domains: [],
};
