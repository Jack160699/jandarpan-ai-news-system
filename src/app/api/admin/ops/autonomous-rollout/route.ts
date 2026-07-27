/**
 * GET  /api/admin/ops/autonomous-rollout — read-only rollout/kill-switch state.
 * POST /api/admin/ops/autonomous-rollout — persist stage_1 into the DB audit
 *      row (autonomous_rollout_state), refusing if the kill switch is on.
 *
 * Gated by ROLLOUT_DIAGNOSTIC_TOKEN (independent of CRON_SECRET) so this can
 * be operated without touching any other route's trust boundary. Returns
 * only the derived stage/killSwitch/publishingEnabled — never raw secrets.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  activateStage1,
  describeRolloutState,
} from "@/lib/autonomous/rollout-state";
import { isNewsroomAutoPublishEnabled } from "@/lib/newsroom/publish-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function authorized(request: Request): boolean {
  const expected = process.env.ROLLOUT_DIAGNOSTIC_TOKEN?.trim();
  if (!expected) return false;
  const provided = request.headers.get("x-diagnostic-token");
  return tokenMatches(provided, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    ...describeRolloutState(),
    newsroomAutoPublish: isNewsroomAutoPublishEnabled(),
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const result = await activateStage1("manual_stage_1_verification");
  return NextResponse.json({ ...result, current: describeRolloutState() });
}
