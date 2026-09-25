import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

let envFile = ".env.production.local";
if (!fs.existsSync(envFile)) envFile = ".env.production.real";
if (!fs.existsSync(envFile)) envFile = ".env.local";
const env = dotenv.parse(fs.readFileSync(envFile, "utf8"));
const clean = (s) => (s ? s.replace(/^["']+|["']+$/g, "").trim() : "");
const url = clean(env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
const key = clean(env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(url, key);

async function run() {
  const now = new Date();
  const d30Ago = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
  console.log("Querying generated_articles published >= 30 days ago:", d30Ago);

  const { data, count, error } = await supabase
    .from("generated_articles")
    .select("id, slug, headline, published_at, tags, editorial_status", { count: "exact" })
    .gte("published_at", d30Ago)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${data.length} articles in last 30 days. Total count: ${count}`);
  data.slice(0, 20).forEach((a, i) => {
    console.log(`${i + 1}. [${a.published_at}] ${a.headline.slice(0, 60)} | tags: ${JSON.stringify(a.tags)}`);
  });

  if (data.length > 0) {
    const oldest = data[data.length - 1];
    console.log(`Oldest article in 30d window: [${oldest.published_at}] ${oldest.headline.slice(0, 60)}`);
  }

  // Also check all-time total articles count
  const { count: totalCount } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true });
  console.log("Total articles in generated_articles table:", totalCount);
}

run().catch(console.error);
