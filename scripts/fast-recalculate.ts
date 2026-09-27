import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.production.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

async function fastRecalculate() {
  console.log("=== FAST RECALCULATE ENGAGEMENT COUNTS ===");

  // 1. Fetch all real likes
  const { data: realLikes, error: likesErr } = await supabase.from("story_likes").select("*");
  if (likesErr) throw likesErr;
  console.log("Real Likes in DB:", realLikes);

  // 2. Fetch all real comments
  const { data: realComments, error: commentsErr } = await supabase.from("story_comments").select("*");
  if (commentsErr) throw commentsErr;
  console.log("Real Comments in DB:", realComments);

  // 3. Fetch all real views
  const { data: realViews, error: viewsErr } = await supabase.from("story_views_log").select("*");
  if (viewsErr) throw viewsErr;
  console.log("Real Views in DB:", realViews);

  // 4. Reset all story_engagement_counts to 0
  const { data: allCounts } = await supabase.from("story_engagement_counts").select("story_id");
  console.log(`Resetting ${allCounts?.length || 0} stories in story_engagement_counts to 0...`);

  // Update in batches of 50
  const stories = (allCounts || []).map((s) => s.story_id);
  const now = new Date().toISOString();
  
  // Update all to 0
  for (let i = 0; i < stories.length; i += 50) {
    const chunk = stories.slice(i, i + 50);
    await supabase
      .from("story_engagement_counts")
      .update({ views_count: 0, likes_count: 0, comments_count: 0, updated_at: now })
      .in("story_id", chunk);
  }

  // 5. Apply real like counts
  const likeMap: Record<string, number> = {};
  for (const l of realLikes || []) {
    likeMap[l.story_id] = (likeMap[l.story_id] || 0) + 1;
  }
  for (const [storyId, count] of Object.entries(likeMap)) {
    await supabase
      .from("story_engagement_counts")
      .upsert({ story_id: storyId, likes_count: count, views_count: 0, comments_count: 0, updated_at: now });
    console.log(`Updated story ${storyId}: likes_count = ${count}`);
  }

  // 6. Apply real comment counts
  const commentMap: Record<string, number> = {};
  for (const c of realComments || []) {
    commentMap[c.story_id] = (commentMap[c.story_id] || 0) + 1;
  }
  for (const [storyId, count] of Object.entries(commentMap)) {
    const existingLikes = likeMap[storyId] || 0;
    await supabase
      .from("story_engagement_counts")
      .upsert({ story_id: storyId, comments_count: count, likes_count: existingLikes, views_count: 0, updated_at: now });
    console.log(`Updated story ${storyId}: comments_count = ${count}`);
  }

  // 7. Verify Heavy Rain Story
  const heavyRainId = "45d579ee-cde7-4b14-8244-bacdceeb84e9";
  const { data: hrRow } = await supabase.from("story_engagement_counts").select("*").eq("story_id", heavyRainId).single();
  console.log("\n=== HEAVY RAIN STORY COUNTS ===");
  console.log(hrRow);

  // 8. Total Summary
  const { count: totalLikes } = await supabase.from("story_likes").select("*", { count: "exact", head: true });
  const { count: totalComments } = await supabase.from("story_comments").select("*", { count: "exact", head: true });
  const { count: totalViews } = await supabase.from("story_views_log").select("*", { count: "exact", head: true });

  console.log("\n=== FINAL AUTHORITATIVE DATABASE COUNTS ===");
  console.log(`Total Authoritative Likes: ${totalLikes}`);
  console.log(`Total Authoritative Comments: ${totalComments}`);
  console.log(`Total Authoritative Views: ${totalViews}`);
}

fastRecalculate().catch(console.error);
