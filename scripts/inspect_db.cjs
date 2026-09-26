const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

const parsed = dotenv.config({ path: ".env.production.real" }).parsed || {};

async function main() {
  const url = parsed.NEXT_PUBLIC_SUPABASE_URL;
  const key = parsed.SUPABASE_SERVICE_ROLE_KEY;
  console.log("Supabase URL:", url);
  const supabase = createClient(url, key);

  const [artCount, evCount, sigCount, genCount] = await Promise.all([
    supabase.from("news_articles").select("*", { count: "exact", head: true }),
    supabase.from("news_events").select("*", { count: "exact", head: true }),
    supabase.from("news_signals").select("*", { count: "exact", head: true }),
    supabase.from("generated_articles").select("*", { count: "exact", head: true }),
  ]);

  console.log("Database Counts:", {
    news_articles: artCount.count,
    news_events: evCount.count,
    news_signals: sigCount.count,
    generated_articles: genCount.count,
  });

  // Check signals with images
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

  // Check how many events have signal_ids vs article_ids
  const { data: events } = await supabase
    .from("news_events")
    .select("id, title, signal_ids, article_ids, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  let evWithSignals = 0;
  let evWithArticles = 0;
  let evWithNeither = 0;
  let totalSignalRefs = 0;
  for (const ev of events || []) {
    if (ev.signal_ids && ev.signal_ids.length > 0) {
      evWithSignals++;
      totalSignalRefs += ev.signal_ids.length;
    } else if (ev.article_ids && ev.article_ids.length > 0) {
      evWithArticles++;
    } else {
      evWithNeither++;
    }
  }
  console.log({
    sample_200_events: {
      with_signal_ids: evWithSignals,
      with_article_ids: evWithArticles,
      with_neither: evWithNeither,
      total_signal_references: totalSignalRefs
    }
  });

  // Check how many news_signals actually exist for the signal_ids referenced in these events
  const allSigIds = events.flatMap(e => e.signal_ids || []).filter(Boolean);
  const { data: matchedSignals } = await supabase
    .from("news_signals")
    .select("id, image_url, title")
    .in("id", allSigIds.slice(0, 100));

  console.log(`Matched ${matchedSignals?.length || 0} signals from ${Math.min(100, allSigIds.length)} referenced signal IDs`);
  const matchedWithMedia = (matchedSignals || []).filter(s => s.image_url && !s.image_url.includes("unsplash"));
  console.log(`Matched signals with real media: ${matchedWithMedia.length}`);
}

main().catch(console.error);
