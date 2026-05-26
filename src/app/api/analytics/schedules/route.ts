import { NextResponse } from "next/server";
import {
  createScheduledReport,
  deleteScheduledReport,
  listScheduledReports,
} from "@/lib/analytics/scheduled-reports";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "analytics:read");
  if (!guard.ok) return guard.response;

  const schedules = await listScheduledReports(guard.session.membership.tenantId);
  return NextResponse.json({ ok: true, schedules });
}

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request, "analytics:read");
  if (!guard.ok) return guard.response;

  let body: {
    name?: string;
    frequency?: "daily" | "weekly" | "monthly";
    format?: "csv" | "json";
    windowHours?: number;
    email?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: "name required" },
      { status: 400 }
    );
  }

  const schedule = await createScheduledReport({
    tenantId: guard.session.membership.tenantId,
    createdBy: guard.session.userId,
    name: body.name.trim(),
    frequency: body.frequency ?? "weekly",
    format: body.format ?? "csv",
    windowHours: body.windowHours ?? 168,
    email: body.email ?? null,
  });

  if (!schedule) {
    return NextResponse.json(
      { ok: false, error: "create_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, schedule });
}

export async function DELETE(request: Request) {
  const guard = await requireDashboardSession(request, "analytics:read");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }

  const ok = await deleteScheduledReport(
    guard.session.membership.tenantId,
    id
  );

  return NextResponse.json({ ok });
}
