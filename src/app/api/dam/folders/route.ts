import { NextResponse } from "next/server";
import { createDamFolder } from "@/lib/dam/store";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  let body: { name?: string; parentId?: string | null };
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

  const folder = await createDamFolder({
    tenantId: guard.session.membership.tenantId,
    name: body.name.trim(),
    parentId: body.parentId ?? null,
  });

  if (!folder) {
    return NextResponse.json(
      { ok: false, error: "create_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, folder });
}
