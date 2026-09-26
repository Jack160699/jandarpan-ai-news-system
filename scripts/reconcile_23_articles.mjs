import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { isCleanRightsEligibleMedia, hasVerifiedRealMedia, isRejectedImageUrl } from "../src/lib/news/images/validate.js";

// Load prod env
dotenv.config({ path: ".env.prod.pulled" });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function main() {
  console.log("=== STEP 1: Fetching generated_articles from Supabase ===");
  // Fetch newest 35 generated articles
  const { data: articles, error } = await supabase
    .from("generated_articles")
    .select("id, event_id, slug, headline, summary, hero_image_url, published_at, workflow_status, editorial_status, tags, editorial_metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(35);

  if (error) {
    console.error("DB Error:", error);
    return;
  }

  console.log(`Fetched ${articles.length} most recent generated articles.`);

  // Find the 23 newest generated articles
  // Let's sort them ascending by created_at or look at the 23 newest
  const newest23 = articles.slice(0, 23);

  console.log("\n=== STEP 2: Fetching live broadcast queue from production ===");
  const [resHi, resEn] = await Promise.all([
    fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi", { headers: { "Cache-Control": "no-cache" } }),
    fetch("https://www.jandarpan.news/api/broadcast/feed?lang=en", { headers: { "Cache-Control": "no-cache" } })
  ]);
  const dataHi = await resHi.json();
  const dataEn = await resEn.json();

  const liveQueueHi = dataHi?.queue || [];
  const liveQueueEn = dataEn?.queue || [];
  const liveHiIds = new Set(liveQueueHi.map(s => s.id));
  const liveEnIds = new Set(liveQueueEn.map(s => s.id));

  console.log(`Live Queue HI length: ${liveQueueHi.length}, EN length: ${liveQueueEn.length}`);

  console.log("\n=== STEP 3: Reconciling each of the 23 newest articles ===");
  const reconciliationTable = [];

  for (let i = 0; i < newest23.length; i++) {
    const a = newest23[i];
    const inLiveHi = liveHiIds.has(a.id);
    const inLiveEn = liveEnIds.has(a.id);

    // Media validation
    const imgUrl = a.hero_image_url || "";
    const cleanMedia = isCleanRightsEligibleMedia(imgUrl);
    const verifiedReal = hasVerifiedRealMedia(imgUrl);
    const rejectedCheck = isRejectedImageUrl(imgUrl);
    const mediaPass = cleanMedia && verifiedReal && !rejectedCheck.rejected;

    // Check tags / categories
    const tags = Array.isArray(a.tags) ? a.tags : [];
    const meta = a.editorial_metadata || {};
    const district = meta.district || meta.districtSlug || (tags.find(t => !["chhattisgarh", "politics", "governance", "crime", "business", "education", "health", "sports"].includes(t)) || null);

    reconciliationTable.push({
      index: i + 1,
      id: a.id,
      eventId: a.event_id,
      headline: a.headline?.slice(0, 45),
      published: Boolean(a.published_at),
      publishedAt: a.published_at,
      heroImage: imgUrl?.slice(0, 45),
      mediaPass,
      mediaRejectionReason: rejectedCheck.rejected ? rejectedCheck.reason : (cleanMedia ? null : "not_clean"),
      tags: tags.join(", "),
      inLiveHi,
      inLiveEn,
      created_at: a.created_at,
    });
  }

  console.table(reconciliationTable);

  const publishedCount = reconciliationTable.filter(r => r.published).length;
  const inLiveCount = reconciliationTable.filter(r => r.inLiveHi).length;
  const missingFromLive = reconciliationTable.filter(r => r.published && !r.inLiveHi);

  console.log(`\nReconciliation Summary for the 23 newest articles:`);
  console.log(`- Published: ${publishedCount}`);
  console.log(`- In Live Queue: ${inLiveCount}`);
  console.log(`- Missing from Live Queue: ${missingFromLive.length}`);

  if (missingFromLive.length > 0) {
    console.log("\n>>> EXACT MISSING STORIES (Published but NOT in Live Queue): <<<");
    missingFromLive.forEach((m, idx) => {
      console.log(`[Missing ${idx + 1}] ID: ${m.id}`);
      console.log(`   Event ID: ${m.eventId}`);
      console.log(`   Headline: ${m.headline}`);
      console.log(`   Hero Image: ${m.heroImage}`);
      console.log(`   Media Pass: ${m.mediaPass} (Reason: ${m.mediaRejectionReason})`);
      console.log(`   Tags: ${m.tags}`);
      console.log(`   Published At: ${m.publishedAt}`);
      console.log(`   Created At: ${m.created_at}`);
      console.log("-----------------------------------------------------------------");
    });
  }
}

main().catch(console.error);
