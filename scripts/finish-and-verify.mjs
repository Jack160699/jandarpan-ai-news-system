import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.production.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const now = new Date().toISOString();
  
  // 1. Ensure comment story count is updated
  const commentStoryId = "b29dab70-9918-4145-92f9-6bf0743b99c6";
  await supabase
    .from("story_engagement_counts")
    .upsert({ story_id: commentStoryId, comments_count: 1, likes_count: 0, views_count: 0, updated_at: now });

  // 2. Fetch Heavy Rain Story
  const heavyRainId = "45d579ee-cde7-4b14-8244-bacdceeb84e9";
  const { data: hrRow } = await supabase.from("story_engagement_counts").select("*").eq("story_id", heavyRainId).single();
  const { data: hrLikes } = await supabase.from("story_likes").select("*").eq("story_id", heavyRainId);
  const { data: hrComments } = await supabase.from("story_comments").select("*").eq("story_id", heavyRainId);

  console.log("\n=== HEAVY RAIN STORY (45d579ee...) ===");
  console.log("Counts row:", JSON.stringify(hrRow));
  console.log("Likes records:", JSON.stringify(hrLikes));
  console.log("Comments records:", JSON.stringify(hrComments));

  // 3. Overall DB Totals
  const { count: likesCount } = await supabase.from("story_likes").select("*", { count: "exact", head: true });
  const { count: commentsCount } = await supabase.from("story_comments").select("*", { count: "exact", head: true });
  const { count: viewsCount } = await supabase.from("story_views_log").select("*", { count: "exact", head: true });

  console.log("\n=== OVERALL DB TOTALS ===");
  console.log(`Likes: ${likesCount}`);
  console.log(`Comments: ${commentsCount}`);
  console.log(`Views: ${viewsCount}`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
