import { NextRequest, NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { checkPublicApiRateLimit } from "@/lib/security/public-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Story Consumption Tracking API
 *
 * GET: Fetch batch consumption status for a user (consumed, read, played, timestamps)
 * POST: Record consumption event (action: 'consumed' | 'read' | 'played')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ ok: true, data: {} });
    }

    const idsParam = searchParams.get("storyIds");
    const storyIds = idsParam
      ? idsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

    const supabase = createAdminServerClient();

    const { data, error } = await (supabase as any).rpc("get_user_consumption_batch", {
      p_user_id: userId,
      p_story_ids: storyIds,
    });

    if (error) {
      console.error("[Consumption API] Error fetching consumption batch:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: data || {},
    });
  } catch (err: unknown) {
    console.error("[Consumption API] Unexpected GET error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rate = await checkPublicApiRateLimit(request, "story-consumption", 180, 60);
    if (!rate.allowed) return rate.response;

    const body = await request.json();
    const { userId, storyId, action } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    }

    if (!storyId || typeof storyId !== "string") {
      return NextResponse.json({ ok: false, error: "Missing storyId" }, { status: 400 });
    }

    const validActions = ["consumed", "read", "played"];
    const normalizedAction = validActions.includes(action) ? action : "consumed";

    const supabase = createAdminServerClient();

    const { data, error } = await (supabase as any).rpc("record_story_consumption", {
      p_user_id: userId,
      p_story_id: storyId,
      p_action: normalizedAction,
    });

    if (error) {
      console.error("[Consumption API] Error recording consumption:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (err: unknown) {
    console.error("[Consumption API] Unexpected POST error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
