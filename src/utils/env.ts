/**
 * Application environment — public vs server-only validation.
 * Supabase public keys are safe in the browser; service role is server-only.
 */

import { isSupabaseConfigured } from "@/lib/supabase/env";

export {
  getPublicSupabaseEnv,
  getServiceRoleEnv,
  getSupabaseEnvDiagnostics,
  isSupabaseConfigured,
  type SupabaseEnvDiagnostics,
} from "@/lib/supabase/env";

const SERVER_ONLY_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "OPENAI_API_KEY",
  "GNEWS_API_KEY",
  "NEWSDATA_API_KEY",
] as const;

/** Throws if a server-only secret is referenced in a browser bundle. */
export function assertServerOnly(caller: string): void {
  if (typeof window !== "undefined") {
    throw new Error(
      `${caller} must run on the server — never import admin clients or service role env in client components`
    );
  }
}

/** True when all three Supabase env vars are present (including service role). */
export function isSupabaseFullyConfigured(): boolean {
  if (!isSupabaseConfigured()) return false;
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function getServerEnvSummary(): Record<string, boolean> {
  return {
    supabasePublic: isSupabaseConfigured(),
    supabaseAdmin: isSupabaseFullyConfigured(),
    cron: Boolean(process.env.CRON_SECRET?.trim()),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    gnews: Boolean(process.env.GNEWS_API_KEY?.trim()),
    newsdata: Boolean(process.env.NEWSDATA_API_KEY?.trim()),
  };
}

/** Guard against accidental `NEXT_PUBLIC_` prefix on secrets. */
export function validateEnvNaming(): string[] {
  const warnings: string[] = [];
  for (const key of SERVER_ONLY_KEYS) {
    if (process.env[`NEXT_PUBLIC_${key}`]) {
      warnings.push(
        `Found NEXT_PUBLIC_${key} — remove NEXT_PUBLIC_ prefix; this secret must not ship to the browser`
      );
    }
  }
  return warnings;
}
