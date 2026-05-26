import { NextResponse } from "next/server";
import { listDamLibrary } from "@/lib/dam/store";
import type { DamMediaType } from "@/lib/dam/types";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const folderId = url.searchParams.get("folderId");
  const tag = url.searchParams.get("tag") ?? undefined;
  const mediaType = url.searchParams.get("type") as DamMediaType | "all" | null;
  const limit = Math.min(100, Number(url.searchParams.get("limit") ?? 48));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));

  const snapshot = await listDamLibrary(guard.session.membership.tenantId, {
    q,
    folderId: folderId === "root" ? null : folderId ?? undefined,
    tag,
    mediaType: mediaType ?? "all",
    limit,
    offset,
  });

  return NextResponse.json({ ok: true, ...snapshot });
}
