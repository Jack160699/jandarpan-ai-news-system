import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl ? "Found" : "Missing");

if (!supabaseUrl || !supabaseKey) {
  console.log("No Supabase credentials in env");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: articles, error } = await supabase
    .from("generated_articles")
    .select("id, slug, headline, hero_image_url, editorial_metadata")
    .order("published_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Query error:", error);
    return;
  }

  console.log(`Fetched ${articles.length} generated_articles:`);
  articles.forEach((a, i) => {
    const meta = a.editorial_metadata;
    console.log(`\n${i + 1}. [${a.headline?.slice(0, 45)}]`);
    console.log("   hero_image_url:", a.hero_image_url);
    console.log("   meta.image:", meta?.image);
    console.log("   meta.source_attribution:", meta?.source_attribution);
    console.log("   meta.media_source_url:", meta?.media_source_url);
  });

  // Also check news_signals to see original image_urls
  const { data: signals } = await supabase
    .from("news_signals")
    .select("id, title, image_url, article_url, provider")
    .order("published_at", { ascending: false })
    .limit(20);

  if (signals) {
    console.log(`\nFetched ${signals.length} news_signals:`);
    signals.forEach((s, i) => {
      console.log(`${i + 1}. [${s.title?.slice(0, 40)}] --> img: ${s.image_url}`);
    });
  }
}

inspect().catch(console.error);
