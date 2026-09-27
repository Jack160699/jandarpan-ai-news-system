import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.production.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

async function cleanEngagementData() {
  console.log("=== CLEANING INVALID ENGAGEMENT DATA ===");

  // 1. Audit current counts
  const { count: totalLikesBefore } = await supabase.from("story_likes").select("*", { count: "exact", head: true });
  const { count: totalCommentsBefore } = await supabase.from("story_comments").select("*", { count: "exact", head: true });
  const { count: totalViewsBefore } = await supabase.from("story_views_log").select("*", { count: "exact", head: true });

  console.log(`Before cleanup: Likes=${totalLikesBefore}, Comments=${totalCommentsBefore}, Views=${totalViewsBefore}`);

  // 2. Identify and delete invalid likes
  const { data: invalidLikes } = await supabase.from("story_likes").select("*").ilike("user_id", "anon_%");
  console.log(`Found ${invalidLikes?.length || 0} invalid anon likes:`, invalidLikes);

  if (invalidLikes && invalidLikes.length > 0) {
    const { error: delLikesErr } = await supabase.from("story_likes").delete().ilike("user_id", "anon_%");
    if (delLikesErr) console.error("Error deleting anon likes:", delLikesErr);
    else console.log("Deleted invalid anon likes successfully.");
  }

  // 3. Identify and delete invalid comments
  const { data: invalidComments } = await supabase
    .from("story_comments")
    .select("*")
    .or("user_id.ilike.anon_%,user_name.eq.Guest Reader");
  console.log(`Found ${invalidComments?.length || 0} invalid anon comments:`, invalidComments);

  if (invalidComments && invalidComments.length > 0) {
    const ids = invalidComments.map((c) => c.id);
    const { error: delCommentsErr } = await supabase.from("story_comments").delete().in("id", ids);
    if (delCommentsErr) console.error("Error deleting invalid comments:", delCommentsErr);
    else console.log("Deleted invalid comments successfully.");
  }

  // 4. Identify and delete invalid views
  const { count: invalidViewsCount } = await supabase
    .from("story_views_log")
    .select("*", { count: "exact", head: true })
    .ilike("user_id", "anon_%");
  console.log(`Found ${invalidViewsCount || 0} invalid anon views in views log.`);

  if (invalidViewsCount && invalidViewsCount > 0) {
    const { error: delViewsErr } = await supabase.from("story_views_log").delete().ilike("user_id", "anon_%");
    if (delViewsErr) console.error("Error deleting anon views:", delViewsErr);
    else console.log("Deleted invalid anon views successfully.");
  }

  // 5. Also delete null user views from automated tests if any
  const { count: nullViewsCount } = await supabase
    .from("story_views_log")
    .select("*", { count: "exact", head: true })
    .is("user_id", null);
  console.log(`Found ${nullViewsCount || 0} unauthenticated/null views.`);
  if (nullViewsCount && nullViewsCount > 0) {
    const { error: delNullViewsErr } = await supabase.from("story_views_log").delete().is("user_id", null);
    if (delNullViewsErr) console.error("Error deleting null views:", delNullViewsErr);
    else console.log("Deleted null views successfully.");
  }

  // 6. Recalculate story_engagement_counts
  console.log("\nRecalculating story_engagement_counts to reflect authoritative data...");
  const { data: allCounts } = await supabase.from("story_engagement_counts").select("story_id");

  for (const row of allCounts || []) {
    const sId = row.story_id;
    const { count: realLikes } = await supabase.from("story_likes").select("*", { count: "exact", head: true }).eq("story_id", sId);
    const { count: realComments } = await supabase.from("story_comments").select("*", { count: "exact", head: true }).eq("story_id", sId);
    const { count: realViews } = await supabase.from("story_views_log").select("*", { count: "exact", head: true }).eq("story_id", sId);

    await supabase
      .from("story_engagement_counts")
      .update({
        likes_count: realLikes || 0,
        comments_count: realComments || 0,
        views_count: realViews || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("story_id", sId);
  }

  // 7. Verify Heavy Rain Story
  const heavyRainId = "45d579ee-cde7-4b14-8244-bacdceeb84e9";
  const { data: heavyRainCounts } = await supabase.from("story_engagement_counts").select("*").eq("story_id", heavyRainId).single();
  const { data: heavyRainLikes } = await supabase.from("story_likes").select("*").eq("story_id", heavyRainId);
  const { data: heavyRainComments } = await supabase.from("story_comments").select("*").eq("story_id", heavyRainId);

  console.log("\n=== HEAVY RAIN STORY VERIFICATION ===");
  console.log("Story ID:", heavyRainId);
  console.log("Counts in DB:", heavyRainCounts);
  console.log("Remaining Likes:", heavyRainLikes);
  console.log("Remaining Comments:", heavyRainComments);

  // 8. Final Totals
  const { count: totalLikesAfter } = await supabase.from("story_likes").select("*", { count: "exact", head: true });
  const { count: totalCommentsAfter } = await supabase.from("story_comments").select("*", { count: "exact", head: true });
  const { count: totalViewsAfter } = await supabase.from("story_views_log").select("*", { count: "exact", head: true });

  console.log(`\n=== FINAL TOTALS ===`);
  console.log(`Likes: ${totalLikesAfter} (was ${totalLikesBefore})`);
  console.log(`Comments: ${totalCommentsAfter} (was ${totalCommentsBefore})`);
  console.log(`Views: ${totalViewsAfter} (was ${totalViewsBefore})`);
}

cleanEngagementData().catch(console.error);
