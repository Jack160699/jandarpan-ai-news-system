import { NextResponse } from "next/server";
import { uploadDamFile } from "@/lib/dam/upload";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "file required" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "file_too_large" },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const folderId = form.get("folderId")?.toString() || null;
  const applyWatermark = form.get("watermark") === "1";
  const copyrightHolder = form.get("copyrightHolder")?.toString();

  const result = await uploadDamFile({
    tenantId: guard.session.membership.tenantId,
    userId: guard.session.userId,
    folderId: folderId || null,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer,
    applyWatermark,
    copyright: copyrightHolder
      ? { holder: copyrightHolder, license: "desk" }
      : undefined,
    runAi: true,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "upload_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    asset: result.asset,
    duplicateOf: result.duplicateOf,
  });
}
