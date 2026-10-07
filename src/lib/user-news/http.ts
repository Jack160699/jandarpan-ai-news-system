/**
 * HTTP helpers for the user-news routes (server only).
 *
 * Identity always comes from the server-validated session cookie (supabase.auth.getUser() verifies the JWT with Supabase Auth). A user id
 * is NEVER read from the request body, a header the client controls, or the URL.
 */

import { NextResponse } from "next/server";
import type { z } from "zod";
import { createCookieServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createProductionDeps } from "@/lib/user-news/supabase-adapters";
import type { Deps, Result } from "@/lib/user-news/types";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };
const MAX_JSON_BYTES = 64 * 1024;

export type SessionUser = { id: string; email: string | null };

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createCookieServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { id: user.id, email: user.email ?? null };
  } catch {
    return null;
  }
}

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export const unauthorized = () => json({ ok: false, error: "unauthorized", message: "Please sign in." }, 401);

/** Maps a service Result to a response. Failures carry a stable `error` code and a message safe to show the author. */
export function respond<T extends object>(result: Result<T>): NextResponse {
  if (result.ok) return json(result, 200);
  return json({ ok: false, error: result.code, message: result.message, ...(result.details ? { details: result.details } : {}) }, result.status);
}

export async function readJson<S extends z.ZodTypeAny>(request: Request, schema: S): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_JSON_BYTES) return { ok: false, response: json({ ok: false, error: "payload_too_large" }, 413) };
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: json({ ok: false, error: "invalid_body" }, 400) };
  }
  if (raw.length > MAX_JSON_BYTES) return { ok: false, response: json({ ok: false, error: "payload_too_large" }, 413) };
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    return { ok: false, response: json({ ok: false, error: "invalid_json" }, 400) };
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, response: json({ ok: false, error: "invalid_request", details: result.error.issues.slice(0, 5).map((i) => ({ path: i.path.join("."), message: i.message })) }, 422) };
  }
  return { ok: true, data: result.data };
}

/** Runs `fn` for the signed-in reader, or answers 401. Wires production dependencies once per request. */
export async function withReader(fn: (user: SessionUser, deps: Deps) => Promise<NextResponse>): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    return await fn(user, await createProductionDeps());
  } catch (err) {
    console.error("[user-news] unhandled", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "server_error", message: "Something went wrong. Please try again." }, 500);
  }
}
