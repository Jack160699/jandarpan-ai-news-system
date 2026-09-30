/**
 * Runtime port: "keep the invocation alive until this write lands".
 *
 * Provider usage / circuit-state writes must not be dropped when a handler returns. The host runtime decides how:
 *  - Next.js (Vercel): `after()` from next/server        -> this file
 *  - Supabase Edge (Deno): collect the promises and await them before the response is finalised
 *                          -> background.edge.ts (swapped in at bundle time by scripts/edge-bundle-check.mjs / the
 *                             Edge build; see docs/EDGE_EDITORIAL_WORKER_DESIGN.md)
 *
 * Both modules export the same two functions so callers never import next/server directly.
 */

import { after } from "next/server";

export function runInBackground(task: () => unknown): void {
  try {
    after(task as () => void | Promise<void>);
  } catch {
    // Outside a Next request scope (scripts, tests, cron helpers): run detached; the promise still completes.
    void Promise.resolve()
      .then(task)
      .catch(() => undefined);
  }
}

/** Next.js tracks `after()` tasks itself; nothing to drain. Present so shared code can call it on every runtime. */
export async function drainBackground(_timeoutMs?: number): Promise<void> {}
