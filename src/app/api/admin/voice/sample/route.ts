/**
 * GET /api/admin/voice/sample?path=tests/<runId>/<name>.mp3 — short-lived signed URL for an admin
 * to audition a generated voice sample. Auth: monitoring:read. Only paths under tests/ are allowed.
 */

import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { getSignedPlaybackUrl } from "@/lib/voice/generate-article-audio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_PATH = /^tests\/[0-9a-f-]{36}\/[a-z-]+\.mp3$/i;

export async function GET(request: Request) {
  const auth = await requireAdminPermission(request, "monitoring:read");
  if (!auth.ok) return auth.response;

  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!SAFE_PATH.test(path)) {
    return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400, headers: noStoreHeaders() });
  }
  const url = await getSignedPlaybackUrl(path, 900);
  if (!url) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404, headers: noStoreHeaders() });
  return NextResponse.json({ ok: true, url, expiresInSec: 900 }, { headers: noStoreHeaders() });
}
