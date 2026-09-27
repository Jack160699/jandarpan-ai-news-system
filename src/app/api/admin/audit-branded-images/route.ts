/**
 * GET /api/admin/audit-branded-images
 *
 * Scans generated_articles for hero_image_url values that match
 * third-party publisher/broadcaster branding patterns.
 * Nulls those images and marks articles needs_image for regeneration.
 *
 * Idempotent: safe to run multiple times.
 * Auth: requires Authorization: Bearer $CRON_SECRET or $ADMIN_API_SECRET
 */

import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase";
import { THIRD_PARTY_BRANDED_OR_TEMPLATE_RE } from "@/lib/news/images/validate";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";

export const runtime = "nodejs";
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const ADMIN_SECRET = process.env.ADMIN_API_SECRET ?? "";

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (CRON_SECRET && token === CRON_SECRET) return true;
  if (ADMIN_SECRET && token === ADMIN_SECRET) return true;
  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminServerClient();

  // Fetch recent published/scheduled articles with images
  const { data: articles, error } = await supabase
    .from("generated_articles")
    .select("id, headline, hero_image_url, workflow_status, published_at")
    .not("hero_image_url", "is", null)
    .neq("hero_image_url", "")
    .in("workflow_status", ["published", "scheduled", "review"])
    .gte(
      "published_at",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    )
    .order("published_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const violations: Array<{ id: string; headline: string; url: string }> = [];

  for (const article of articles ?? []) {
    if (!article.hero_image_url) continue;
    if (THIRD_PARTY_BRANDED_OR_TEMPLATE_RE.test(article.hero_image_url)) {
      violations.push({
        id: article.id,
        headline: article.headline ?? "(no headline)",
        url: article.hero_image_url,
      });
    }
  }

  if (violations.length === 0) {
    return NextResponse.json(
      { ok: true, violations: 0, message: "No branded image violations found." },
      { headers: noStoreHeaders() }
    );
  }

  // Null the branded images and flag for regeneration
  const violationIds = violations.map((v) => v.id);
  const { error: updateError } = await supabase
    .from("generated_articles")
    .update({ hero_image_url: null, editorial_status: "needs_image" })
    .in("id", violationIds);

  if (updateError) {
    return NextResponse.json(
      {
        ok: false,
        error: `Found ${violations.length} violations but update failed: ${updateError.message}`,
        violations,
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      violations: violations.length,
      fixed: violations.length,
      details: violations,
      message: `Removed ${violations.length} third-party branded images. Marked for image regeneration.`,
    },
    { headers: noStoreHeaders() }
  );
}
