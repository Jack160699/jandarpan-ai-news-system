import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.production.local" });

import { createClient } from "@supabase/supabase-js";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^[\\"']+|[\\"']+$/g, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^[\\"']+|[\\"']+$/g, "");

console.log("URL length:", url.length);
console.log("Starts with https?:", url.startsWith("https://"));
console.log("Char codes:", url.split("").slice(0, 10).map((c) => c.charCodeAt(0)));
const supabase = createClient(url, key);

async function run() {
  console.log("1. Testing record_story_play RPC...");
  const { data: viewData, error: viewError } = await supabase.rpc("record_story_play", {
    p_story_id: "story-test-node",
    p_play_cycle_id: `cycle-${Date.now()}`,
    p_user_id: null,
  });
  console.log("View RPC result:", { viewData, viewError });

  console.log("\n2. Testing duplicate record_story_play RPC (Idempotency)...");
  const cycleId = "cycle-fixed-idempotent";
  const { data: idemp1 } = await supabase.rpc("record_story_play", {
    p_story_id: "story-test-node",
    p_play_cycle_id: cycleId,
    p_user_id: null,
  });
  console.log("First play cycle result:", idemp1);

  const { data: idemp2 } = await supabase.rpc("record_story_play", {
    p_story_id: "story-test-node",
    p_play_cycle_id: cycleId,
    p_user_id: null,
  });
  console.log("Duplicate play cycle result (MUST match first):", idemp2);

  console.log("\n3. Testing toggle_story_like RPC...");
  const { data: like1, error: likeError1 } = await supabase.rpc("toggle_story_like", {
    p_story_id: "story-test-node",
    p_user_id: "test-user-1",
  });
  console.log("Toggle like ON:", { like1, likeError1 });

  console.log("\n4. Testing add_story_comment RPC...");
  const { data: commentData, error: commentError } = await supabase.rpc("add_story_comment", {
    p_story_id: "story-test-node",
    p_user_id: "test-user-1",
    p_user_name: "श्रीयांश",
    p_comment_text: "जन दर्पण का यह विश्लेषण बहुत सटीक है!",
  });
  console.log("Add comment result:", { commentData, commentError });

  console.log("\n5. Testing get_stories_engagement RPC...");
  const { data: batchData, error: batchError } = await supabase.rpc("get_stories_engagement", {
    p_story_ids: ["story-test-node"],
    p_user_id: "test-user-1",
  });
  console.log("Batch engagement result:", { batchData, batchError });

  console.log("\nCleaning up test story data...");
  await supabase.from("story_comments").delete().eq("story_id", "story-test-node");
  await supabase.from("story_likes").delete().eq("story_id", "story-test-node");
  await supabase.from("story_views_log").delete().eq("story_id", "story-test-node");
  await supabase.from("story_engagement_counts").delete().eq("story_id", "story-test-node");
  console.log("Cleaned up successfully!");
}

run().catch(console.error);
