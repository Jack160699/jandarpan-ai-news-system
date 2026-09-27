/**
 * GET /api/admin/fix-upi-day-image
 *
 * Targeted fix for the "व्यापारी 2 अक्टूबर को मनाएंगे नो UPI Day" article.
 * Searches by headline pattern, removes any Dainik Bhaskar or other third-party
 * branded image, and marks the article for image regeneration.
 *
 * Auth: requires Authorization: Bearer $CRON_SECRET or $ADMIN_API_SECRET
 * Idempotent: safe to call multiple times.
 */

import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase";
import { THIRD_PARTY_BRANDED_OR_TEMPLATE_RE } from "@/lib/news/images/validate";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";

export const runtime = "nodejs";
export const maxDuration = 30;

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

  // Search for the UPI Day article by headline pattern
  const { data: candidates, error } = await supabase
    .from("generated_articles")
    .select("id, headline, hero_image_url, workflow_status")
    .or("headline.ilike.%UPI Day%,headline.ilike.%नो UPI%,headline.ilike.%व्यापारी%2 अक्टूबर%")
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: noStoreHeaders() });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json(
      { ok: true, found: 0, message: "UPI Day article not found in database." },
      { headers: noStoreHeaders() }
    );
  }

  const toFix: string[] = [];

  for (const article of candidates) {
    // Fix if image is third-party branded OR if it has any Dainik Bhaskar content
    const imageUrl = article.hero_image_url ?? "";
    const isBranded =
      imageUrl &&
      (THIRD_PARTY_BRANDED_OR_TEMPLATE_RE.test(imageUrl) ||
        /bhaskar|dainik|news18|ibc24|lalluram/i.test(imageUrl));

    // Also fix if no image or needs regeneration regardless
    if (isBranded || imageUrl === "") {
      toFix.push(article.id);
    }
  }

  if (toFix.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        found: candidates.length,
        fixed: 0,
        candidates: candidates.map((c) => ({ id: c.id, headline: c.headline, imageUrl: c.hero_image_url })),
        message: "Found articles but no branded image violations detected.",
      },
      { headers: noStoreHeaders() }
    );
  }

  const { error: updateError } = await supabase
    .from("generated_articles")
    .update({ hero_image_url: null, editorial_status: "needs_image" })
    .in("id", toFix);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message, toFix },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      found: candidates.length,
      fixed: toFix.length,
      fixedIds: toFix,
      candidates: candidates.map((c) => ({ id: c.id, headline: c.headline, imageUrl: c.hero_image_url })),
      message: `Fixed ${toFix.length} article(s): branded image removed, marked for regeneration.`,
    },
    { headers: noStoreHeaders() }
  );
}
