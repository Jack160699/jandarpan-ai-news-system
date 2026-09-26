import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.prod.pulled" });

async function main() {
  const urlMatch = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/[^\s"'\\<>]+/);
  const url = urlMatch ? urlMatch[0] : "";
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/^[\\"'\s]+|[\\"'\s]+$/g, "").trim();
  console.log("Parsed URL:", JSON.stringify(url));
  const supabase = createClient(url, key);

  const [artCount, evCount, sigCount, genCount] = await Promise.all([
    supabase.from("news_articles").select("*", { count: "exact", head: true }),
    supabase.from("news_events").select("*", { count: "exact", head: true }),
    supabase.from("news_signals").select("*", { count: "exact", head: true }),
    supabase.from("generated_articles").select("*", { count: "exact", head: true }),
  ]);

  console.log("Counts:", {
    news_articles: artCount.count,
    news_events: evCount.count,
    news_signals: sigCount.count,
    generated_articles: genCount.count,
  });

  const { count: sigWithImg } = await supabase
    .from("news_signals")
    .select("*", { count: "exact", head: true })
    .not("image_url", "is", null)
    .neq("image_url", "");
  console.log("Signals with any non-empty image_url:", sigWithImg);

  const { count: artWithImg } = await supabase
    .from("news_articles")
    .select("*", { count: "exact", head: true })
    .not("image_url", "is", null)
    .neq("image_url", "");
  console.log("Articles with any non-empty image_url:", artWithImg);

  // Check how many news_events exist
  const { data: sampleEvents } = await supabase
    .from("news_events")
    .select("id, title, signal_ids, article_ids, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  console.log("\nSample recent news_events:");
  for (const ev of sampleEvents || []) {
    console.log(`- [${ev.id}] title: ${ev.title?.slice(0, 50)} | signal_ids: ${ev.signal_ids?.length || 0} | article_ids: ${ev.article_ids?.length || 0}`);
  }

  // How many news_events have signal_ids vs article_ids?
  const { data: allEvents } = await supabase
    .from("news_events")
    .select("id, title, signal_ids, article_ids, metadata")
    .order("created_at", { ascending: false })
    .limit(200);

  let evWithSignals = 0;
  let evWithArticles = 0;
  let evWithNeither = 0;
  for (const ev of allEvents || []) {
    if (ev.signal_ids && ev.signal_ids.length > 0) evWithSignals++;
    else if (ev.article_ids && ev.article_ids.length > 0) evWithArticles++;
    else evWithNeither++;
  }
  console.log({
    sample_200_events: {
      with_signal_ids: evWithSignals,
      with_article_ids: evWithArticles,
      with_neither: evWithNeither
    }
  });
}

main().catch(console.error);
