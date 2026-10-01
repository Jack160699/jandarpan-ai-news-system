/**
 * Supabase Edge Function entry point: `translation-worker`. Built by `pnpm edge:build` into
 * supabase/functions/translation-worker/worker.bundle.js. Only this file touches Deno globals.
 */

import "@/edge/editorial-worker/bootstrap-env"; // must stay first: env parity before any module reads process.env
import { createKitDeps } from "@/lib/edge/worker-kit/kit-deps";
import { handleWorkerRequest } from "@/lib/edge/worker-kit/kit";
import { TRANSLATION_SPEC } from "@/lib/edge/workers/translation-spec";

type DenoLike = { serve(handler: (request: Request) => Response | Promise<Response>): unknown };

const deno = (globalThis as unknown as { Deno?: DenoLike }).Deno;
if (deno) {
  const deps = createKitDeps(process.env);
  deno.serve((request) => handleWorkerRequest(request, TRANSLATION_SPEC, deps));
}
