// Supabase Edge Function: editorial-worker (one editorial candidate per invocation).
//
// This file is intentionally tiny. The implementation is bundled from src/edge/editorial-worker/serve.ts by
//   pnpm edge:build
// into ./worker.bundle.js (git-ignored, ~0.5 MB). Deploy only after building:
//   pnpm edge:build && supabase functions deploy editorial-worker --no-verify-jwt --use-api
// See docs/EDGE_EDITORIAL_WORKER_DESIGN.md. Nothing is deployed by committing this file.
//
// The bundle is imported dynamically so that a boot-time failure (an unsupported API in the hosted runtime) is
// reported as a diagnosable JSON error instead of an opaque platform "WORKER_ERROR".
declare const Deno: { serve(handler: () => Response): unknown };

try {
  await import("./worker.bundle.js");
} catch (e) {
  const message = String((e as Error)?.stack ?? e).slice(0, 1500);
  console.error("[editorial-worker] boot failed:", message);
  Deno.serve(
    () =>
      new Response(JSON.stringify({ ok: false, status: "boot_failed", error: message }), {
        status: 500,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      })
  );
}

export {};
