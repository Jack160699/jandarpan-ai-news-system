import { NextResponse } from "next/server";
import { legacyDashboardApiHeaders } from "@/lib/admin-platform/api-deprecation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = legacyDashboardApiHeaders("/api/admin/team");

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "deprecated_use_admin_team_api",
      successor: "/api/admin/team",
    },
    { status: 410, headers: HEADERS }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "deprecated_use_admin_team_api",
      successor: "/api/admin/team",
    },
    { status: 410, headers: HEADERS }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      ok: false,
      error: "deprecated_use_admin_team_api",
      successor: "/api/admin/team",
    },
    { status: 410, headers: HEADERS }
  );
}
