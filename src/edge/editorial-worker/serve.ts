/**
 * Supabase Edge Function entry point: `editorial-worker`.
 *
 * Bundled by scripts/edge-bundle-check.mjs (`pnpm edge:build`) into supabase/functions/editorial-worker/worker.bundle.js.
 * Deploy with JWT verification off - requests are authenticated by the bearer secret inside the handler:
 *   supabase functions deploy editorial-worker --no-verify-jwt        (NOT done yet - see docs)
 *
 * This file is the only place that touches Deno-specific globals; everything else is portable TypeScript.
 */

import "@/edge/editorial-worker/bootstrap-env"; // must stay first: env parity before any module reads process.env
import { createProductionDeps } from "@/lib/edge/editorial-worker/deps";
import { handleEditorialWorkerRequest } from "@/lib/edge/editorial-worker/handler";

type DenoLike = {
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
};

const deno = (globalThis as unknown as { Deno?: DenoLike }).Deno;
if (deno) {
  const deps = createProductionDeps(process.env);
  deno.serve((request) => handleEditorialWorkerRequest(request, deps));
}
