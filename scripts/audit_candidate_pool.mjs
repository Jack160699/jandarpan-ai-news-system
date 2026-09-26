import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ path: fs.existsSync(".env.production.local") ? ".env.production.local" : ".env.prod.pulled" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runAudit() {
  console.log("=== EXAMINING EDITORIAL PIPELINE CANDIDATE POOL ===");

  // 1. Total Raw Signals Ingested
  const { count: rawSignalsCount } = await supabase
    .from("news_signals")
    .select("*", { count: "exact", head: true });

  // 2. Events Count
  const { count: eventsCount } = await supabase
    .from("news_events")
    .select("*", { count: "exact", head: true });

  // 3. Real Media Events
  // Let's sample events and their signals to see how many have valid photojournalism
  const { data: events, error } = await supabase
    .from("news_events")
    .select("id, title, category, status, signal_ids, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Error fetching events:", error);
    return;
  }

  // Collect all signal IDs
  const allSignalIds = [];
  events.forEach(e => {
    if (Array.isArray(e.signal_ids)) {
      allSignalIds.push(...e.signal_ids);
    }
  });

  const uniqueSignalIds = [...new Set(allSignalIds)];
  console.log(`Auditing ${events.length} latest events across ${uniqueSignalIds.length} signals...`);

  // Fetch signals in chunks
  const signalMap = new Map();
  for (let i = 0; i < uniqueSignalIds.length; i += 500) {
    const chunk = uniqueSignalIds.slice(i, i + 500);
    const { data: signals } = await supabase
      .from("news_signals")
      .select("id, title, source, url, image_url, language, metadata")
      .in("id", chunk);
    (signals || []).forEach(s => signalMap.set(s.id, s));
  }

  const { isCleanRightsEligibleMedia } = await import("../src/lib/news/ai/clean-rights-media-gate.ts");

  let eventsWithAnyImage = 0;
  let eventsWithCleanRealPhoto = 0;
  let eventsWithUnsplash = 0;
  let eventsNoImage = 0;

  const validPhotoEvents = [];

  for (const event of events) {
    const sigs = (event.signal_ids || []).map(id => signalMap.get(id)).filter(Boolean);
    let bestImage = null;
    let hasUnsplash = false;
    for (const sig of sigs) {
      if (sig.image_url) {
        if (sig.image_url.includes("unsplash.com") || sig.image_url.includes("pexels.com")) {
          hasUnsplash = true;
        } else if (isCleanRightsEligibleMedia(sig.image_url, { title: event.title, source: sig.source, content: "" })) {
          bestImage = sig.image_url;
          break;
        }
      }
    }

    if (bestImage) {
      eventsWithCleanRealPhoto++;
      validPhotoEvents.push({ event, image: bestImage });
    } else if (hasUnsplash) {
      eventsWithUnsplash++;
    } else {
      eventsNoImage++;
    }
  }

  console.log("\nResults for sample of", events.length, "events:");
  console.log("- Events with clean real regional photojournalism:", eventsWithCleanRealPhoto);
  console.log("- Events with stock/Unsplash (prohibited):", eventsWithUnsplash);
  console.log("- Events with no image:", eventsNoImage);
  console.log("- Real media ratio in sample:", ((eventsWithCleanRealPhoto / events.length) * 100).toFixed(1) + "%");

  // Check published articles
  const { data: publishedArticles } = await supabase
    .from("news_articles")
    .select("id, title, hero_image_url, status, published_at")
    .eq("status", "published");

  let publishedWithCleanRealPhoto = 0;
  let publishedWithUnsplash = 0;
  let publishedNoImage = 0;

  for (const art of (publishedArticles || [])) {
    if (!art.hero_image_url) {
      publishedNoImage++;
    } else if (art.hero_image_url.includes("unsplash.com")) {
      publishedWithUnsplash++;
    } else if (isCleanRightsEligibleMedia(art.hero_image_url, { title: art.title, source: "jan_darpan", content: "" })) {
      publishedWithCleanRealPhoto++;
    } else {
      publishedNoImage++;
    }
  }

  console.log("\nPublished Articles in Database (" + (publishedArticles?.length || 0) + " total):");
  console.log("- Clean real photojournalism (Live-eligible):", publishedWithCleanRealPhoto);
  console.log("- Legacy Unsplash stock (Media-gate rejected):", publishedWithUnsplash);
  console.log("- No image/broken:", publishedNoImage);

  console.log("\nSample clean photos from real event reservoir:");
  validPhotoEvents.slice(0, 5).forEach((item, idx) => {
    console.log(`[${idx + 1}] Event "${item.event.title.slice(0, 50)}...": ${item.image}`);
  });
}

runAudit().catch(console.error);
