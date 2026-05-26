import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSuperAdminSession } from "@/lib/newsroom-auth/require-super-admin";
import { runSchemaHealthChecks } from "@/lib/supabase/schema-health";
import { reloadPostgrestSchema } from "@/lib/supabase/reload-schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdminSession(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const report = await runSchemaHealthChecks();
  return NextResponse.json(report);
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdminSession(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const reload = await reloadPostgrestSchema();
  const report = await runSchemaHealthChecks();

  return NextResponse.json({ reload, report });
}
