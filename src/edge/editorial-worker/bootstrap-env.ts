/**
 * Runtime parity for the shared code, which reads configuration from `process.env` (some of it at import time, e.g.
 * INFRA_CONFIG) and expects the Next.js-style Supabase variable names. This module has NO imports and is imported
 * FIRST by serve.ts, so it runs before any application module is evaluated.
 *
 * Supabase injects SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY into every Edge Function; the app
 * reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Existing values always win.
 */

type DenoEnvLike = { env?: { toObject(): Record<string, string> } };

const g = globalThis as unknown as {
  Deno?: DenoEnvLike;
  process?: { env?: Record<string, string | undefined> };
};

if (!g.process) g.process = { env: {} };
if (!g.process.env) g.process.env = {};
const env = g.process.env;
try {
  for (const [k, v] of Object.entries(g.Deno?.env?.toObject() ?? {})) if (env[k] === undefined) env[k] = v;
} catch {
  /* env permission not granted: nothing to bridge */
}
env.NEXT_PUBLIC_SUPABASE_URL ??= env.SUPABASE_URL;
env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= env.SUPABASE_ANON_KEY;
env.NODE_ENV ??= "production";

export {};
