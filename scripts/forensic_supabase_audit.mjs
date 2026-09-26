import fs from "fs";
import { createClient } from "@supabase/supabase-js";

function getVal(key) {
  const content = fs.readFileSync(".env.production.local", "utf8");
  for (const line of content.split("\n")) {
    const cleanLine = line.replace(/\r/g, "").trim();
    if (cleanLine.startsWith(`${key}=`)) {
      let val = cleanLine.slice(key.length + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      return val.trim();
    }
  }
  return "";
}

async function main() {
  const url = getVal("NEXT_PUBLIC_SUPABASE_URL");
  const key = getVal("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key);

  const { data: articles, error } = await supabase
    .from("generated_articles")
    .select("id, event_id, slug, headline, summary, article_body, hero_image_url, published_at, workflow_status, editorial_status, tags, editorial_metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(35);

  if (error) {
    console.error("Error fetching articles:", error);
    return;
  }

  console.log(`Fetched ${articles.length} articles.`);
  fs.writeFileSync("scripts/supabase_articles_dump.json", JSON.stringify(articles, null, 2));
  console.log("Saved to scripts/supabase_articles_dump.json");
  articles.forEach((a, i) => {
    console.log(`[${i + 1}] ID: ${a.id} | Event: ${a.event_id} | Created: ${a.created_at} | Pub: ${Boolean(a.published_at)}`);
    console.log(`    Headline: ${a.headline}`);
    console.log(`    Hero: ${a.hero_image_url}`);
  });
}

main().catch(console.error);
