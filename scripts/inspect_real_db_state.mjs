import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.production.local" });

import { createClient } from "@supabase/supabase-js";

async function inspectDb() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^['"]+|['"]+$/g, "");
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^['"]+|['"]+$/g, "");

  const supabase = createClient(url, serviceKey);

  console.log("=== 1. CHECK user_story_consumption ROWS ===");
  const { data: consumptionRows, error: cErr } = await supabase
    .from("user_story_consumption")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (cErr) {
    console.error("Consumption select error:", cErr.message);
  } else {
    console.log(`Found ${consumptionRows?.length} consumption records:`);
    for (const r of consumptionRows || []) {
      console.log(`- user: ${r.user_id}, story: ${r.story_id}, consumed: ${r.consumed}, played: ${r.played}, read: ${r.read}, first: ${r.first_consumed_at}`);
    }
  }

  console.log("\n=== 2. CHECK generated_articles DATES & IDs ===");
  const { data: articles, error: aErr } = await supabase
    .from("generated_articles")
    .select("id, slug, headline, district, published_at, created_at, status")
    .order("published_at", { ascending: false })
    .limit(25);

  if (aErr) {
    console.error("Articles select error:", aErr.message);
  } else {
    console.log(`Found ${articles?.length} recent generated articles:`);
    const now = Date.now();
    for (const a of articles || []) {
      const pubMs = a.published_at ? new Date(a.published_at).getTime() : 0;
      const ageHours = pubMs ? ((now - pubMs) / 3600000).toFixed(1) : "NULL";
      console.log(`- [${a.id}] (${ageHours}h ago) [${a.district || "NO_DISTRICT"}] ${a.headline?.slice(0, 40)}... (published: ${a.published_at})`);
    }
  }

  console.log("\n=== 3. CHECK FOR NULL OR INVALID DATES IN generated_articles ===");
  const { count: nullCount } = await supabase
    .from("generated_articles")
    .select("*", { count: "exact", head: true })
    .is("published_at", null);
  console.log(`Articles with NULL published_at: ${nullCount}`);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: olderCount } = await supabase
    .from("generated_articles")
    .select("*", { count: "exact", head: true })
    .lt("published_at", thirtyDaysAgo);
  console.log(`Articles older than 30 days: ${olderCount}`);
}

inspectDb().catch(console.error);
