/**
 * Runtime parity for the shared code, which reads configuration from `process.env` (some of it at import time, e.g.
 * INFRA_CONFIG) and expects the Next.js-style Supabase variable names. This module has NO imports and is imported
 * FIRST by serve.ts, so it runs before any application module is evaluated.
 *
 * IMPORTANT (found by deploying to the real Supabase Edge runtime): the hosted runtime's `process.env` is READ-ONLY -
 * assigning to it throws `NotSupported` - whereas local Deno allows writes. So this module never writes to the real
 * environment. It installs an OVERLAY `process` whose `env` is a plain object seeded from `Deno.env`, plus the derived
 * names; every other `process` member (cpuUsage, memoryUsage, ...) is delegated to the real object.
 *
 * Supabase injects SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY into every Edge Function; the app
 * reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Existing values always win.
 */

type DenoEnvLike = { env?: { toObject(): Record<string, string> } };

const g = globalThis as unknown as {
  Deno?: DenoEnvLike;
  process?: Record<string | symbol, unknown> & { env?: Record<string, string | undefined> };
};

const overlay: Record<string, string | undefined> = {};
try {
  Object.assign(overlay, g.Deno?.env?.toObject() ?? {});
} catch {
  /* env permission not granted: nothing to bridge */
}
overlay.NEXT_PUBLIC_SUPABASE_URL ??= overlay.SUPABASE_URL;
overlay.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= overlay.SUPABASE_ANON_KEY;
overlay.NODE_ENV ??= "production";

const real = g.process;
const overlayProcess: unknown = real
  ? new Proxy(real, {
      get(target, key) {
        if (key === "env") return overlay;
        const value = Reflect.get(target, key);
        return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
      },
      has(target, key) {
        return key === "env" || Reflect.has(target, key);
      },
    })
  : { env: overlay };

Object.defineProperty(globalThis, "process", { value: overlayProcess, configurable: true, writable: true });

export {};
