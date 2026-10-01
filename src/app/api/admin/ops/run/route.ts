/**
 * POST /api/admin/ops/run { action } — safe "run now" controls.
 * Auth: admin session with publish:write. Audited, rate limited, non-overlapping; returns a run id.
 * The work itself runs after the response (after()), so the request returns immediately.
 */

import { NextResponse, after } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { startManualRun } from "@/lib/admin-ops/run-actions";
import { isRunActionId, RUN_ACTION_META } from "@/lib/admin-ops/run-actions-meta";
import { OPS_SNAPSHOT_TAG } from "@/lib/admin-ops/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAdminPermission(request, "publish:write");
  if (!auth.ok) return auth.response;

  let body: { action?: unknown } = {};
  try {
    body = (await request.json()) as { action?: unknown };
  } catch {
    /* handled below */
  }
  if (!isRunActionId(body.action)) {
    return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400, headers: noStoreHeaders() });
  }

  const { session } = auth;
  const started = await startManualRun(
    body.action,
    { userId: session.userId, email: session.membership.email ?? null, role: session.membership.role },
    new URL(request.url).origin
  );

  if (!started.ok) {
    return NextResponse.json(
      { ok: false, error: started.error, retryAfterSec: started.retryAfterSec },
      {
        status: started.status,
        headers: {
          ...noStoreHeaders(),
          ...(started.retryAfterSec ? { "Retry-After": String(started.retryAfterSec) } : {}),
        },
      }
    );
  }

  after(async () => {
    await started.execute();
    revalidateTag(OPS_SNAPSHOT_TAG, "max");
  });

  return NextResponse.json(
    { ok: true, runId: started.runId, action: started.action, label: RUN_ACTION_META[started.action].label },
    { status: 202, headers: noStoreHeaders() }
  );
}
