/**
 * POST /api/admin/notifications/actions — mark read / acknowledge (server-authorized).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { acknowledgeIncident } from "@/lib/admin-v3/incident-feed";
import { logAdminAccessDenied } from "@/lib/security/admin-access-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  action: z.enum(["mark_read", "acknowledge"]),
  id: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request, "content:read");
  if (!guard.ok) return guard.response;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const role = guard.session.membership.role;

  if (body.action === "acknowledge") {
    if (!roleHasPermission(role, "monitoring:read")) {
      await logAdminAccessDenied({
        request,
        reason: "permission_denied",
        resourceType: "notification_action",
        resourceId: "acknowledge",
        session: guard.session,
      });
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    // No destructive retry/purge here — acknowledge only.
    const ok = acknowledgeIncident(body.id);
    return NextResponse.json({ ok, action: "acknowledge", id: body.id });
  }

  // mark_read: collaboration ids only (collab-*); ops incidents use acknowledge.
  if (body.id.startsWith("collab-")) {
    if (!roleHasPermission(role, "editorial:write")) {
      await logAdminAccessDenied({
        request,
        reason: "permission_denied",
        resourceType: "notification_action",
        resourceId: "mark_read",
        session: guard.session,
      });
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    // Client also tracks local read state; collab store write is best-effort later.
    return NextResponse.json({
      ok: true,
      action: "mark_read",
      id: body.id,
      persisted: false,
    });
  }

  // Treat generic mark_read on ops ids as acknowledge for convenience.
  if (roleHasPermission(role, "monitoring:read")) {
    acknowledgeIncident(body.id);
    return NextResponse.json({ ok: true, action: "acknowledge", id: body.id });
  }

  return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
}
