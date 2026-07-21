import "server-only";

import { createAdminClient } from "@/lib/supabase";

/**
 * Untyped accessor until `supabase gen types` includes verified_rate_* tables.
 */
export function verifiedRatesDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as any;
}
