import { NextRequest, NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get("storyId");

    if (!storyId) {
      return NextResponse.json({ ok: false, error: "Missing storyId" }, { status: 400 });
    }

    const supabase = createAdminServerClient();
    const { data, error } = await (supabase as any)
      .from("story_comments")
      .select("id, story_id, user_id, user_name, comment_text, created_at")
      .eq("story_id", storyId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Comments API] Error fetching comments:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      comments: data || [],
    });
  } catch (err: unknown) {
    console.error("[Comments API] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
