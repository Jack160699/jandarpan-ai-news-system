import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.production.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

async function finishAndVerify() {
  const now = new Date().toISOString();
  // Update comment story
  const commentStoryId = "b29dab70-9918-4145-92f9-6bf0743b99c6";
  await supabase
    .from("story_engagement_counts")
    .upsert({ story_id: commentStoryId, comments_count: 1, likes_count: 0, views_count: 0, updated_at: now });

  // Verify Heavy Rain Story
  const heavyRainId = "45d579ee-cde7-4b14-8244-bacdceeb84e9";
  const { data: hrRow } = await supabase.from("story_engagement_counts").select("*").eq("story_id", heavyRainId).single();
  const { data: hrLikes } = await supabase.from("story_likes").select("*").eq("story_id", heavyRainId);
  const { data: hrComments } = await supabase.from("story_comments").select("*").eq("story_id", heavyRainId);

  console.log("\n=== HEAVY RAIN STORY (45d579ee...) ===");
  console.log("Counts row:", hrRow);
  console.log("Likes records:", hrLikes);
  console.log("Comments records:", hrComments);

  // Overall database totals
  const { count: likesCount } = await supabase.from("story_likes").select("*", { count: "exact", head: true });
  const { count: commentsCount } = await supabase.from("story_comments").select("*", { count: "exact", head: true });
  const { count: viewsCount } = await supabase.from("story_views_log").select("*", { count: "exact", head: true });

  console.log("\n=== OVERALL DB TOTALS ===");
  console.log(`Likes: ${likesCount}`);
  console.log(`Comments: ${commentsCount}`);
  console.log(`Views: ${viewsCount}`);
}

finishAndVerify().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
