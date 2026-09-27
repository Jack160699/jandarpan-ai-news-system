import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.production.local" });

import { createClient } from "@supabase/supabase-js";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^[\\"']+|[\\"']+$/g, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^[\\"']+|[\\"']+$/g, "");

const supabase = createClient(url, key);

async function run() {
  console.log("1. Testing record_story_consumption (played)...");
  const { data: playedData, error: playedError } = await supabase.rpc("record_story_consumption", {
    p_user_id: "test-user-consumption",
    p_story_id: "story-1",
    p_action: "played",
  });
  console.log("Played RPC result:", { playedData, playedError });

  console.log("\n2. Testing record_story_consumption (consumed)...");
  const { data: consumedData, error: consumedError } = await supabase.rpc("record_story_consumption", {
    p_user_id: "test-user-consumption",
    p_story_id: "story-1",
    p_action: "consumed",
  });
  console.log("Consumed RPC result:", { consumedData, consumedError });

  console.log("\n3. Testing get_user_consumption_batch...");
  const { data: batchData, error: batchError } = await supabase.rpc("get_user_consumption_batch", {
    p_user_id: "test-user-consumption",
    p_story_ids: ["story-1", "story-2"],
  });
  console.log("Batch consumption result:", { batchData, batchError });

  console.log("\nCleaning up test consumption data...");
  const { error: delError } = await supabase
    .from("user_story_consumption")
    .delete()
    .eq("user_id", "test-user-consumption");
  console.log("Cleanup result:", { delError });
}

run().catch(console.error);
