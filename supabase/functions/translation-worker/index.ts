// Supabase Edge Function: translation-worker (one bounded unit of work per invocation).
//
// Intentionally tiny. The implementation is bundled from src/edge/translation-worker/serve.ts by `pnpm edge:build` into
// ./worker.bundle.js (git-ignored). Deploy only after building:
//   pnpm edge:build && supabase functions deploy translation-worker --no-verify-jwt --use-api
// The bundle is imported dynamically so a boot-time failure is reported as diagnosable JSON instead of an opaque
// platform "WORKER_ERROR". See docs/EDGE_EDITORIAL_WORKER_DESIGN.md.
declare const Deno: { serve(handler: () => Response): unknown };

try {
  await import("./worker.bundle.js");
} catch (e) {
  const message = String((e as Error)?.stack ?? e).slice(0, 1500);
  console.error("[translation-worker] boot failed:", message);
  Deno.serve(
    () =>
      new Response(JSON.stringify({ ok: false, status: "boot_failed", error: message }), {
        status: 500,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      })
  );
}

export {};
