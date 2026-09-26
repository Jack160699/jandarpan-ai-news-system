import fs from "fs";
import {
  isCleanRightsEligibleMedia,
  hasVerifiedRealMedia,
  isRejectedImageUrl,
  extractVerifiedRealMediaUrl,
} from "../src/lib/news/images/validate.ts";
import { resolveCanonicalStoryDistrict } from "../src/lib/regional/canonical-district.ts";
import { resolveCanonicalCategories } from "../src/lib/editorial/canonical-categories.ts";

async function main() {
  const [resHi, resEn] = await Promise.all([
    fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi", { cache: "no-store" }),
    fetch("https://www.jandarpan.news/api/broadcast/feed?lang=en", { cache: "no-store" }),
  ]);
  const dataHi = await resHi.json();
  const dataEn = await resEn.json();
  const queueHi = dataHi?.queue || [];
  const queueEn = dataEn?.queue || [];

  const queueHiMap = new Map(queueHi.map((s) => [s.id, s]));
  const queueEnMap = new Map(queueEn.map((s) => [s.id, s]));

  const batchData = JSON.parse(fs.readFileSync("scripts/batch_23_exact.json", "utf8"));
  const all23 = batchData.all23;

  console.log(`Analyzing ${all23.length} canonical articles...`);

  const results = [];

  for (let i = 0; i < all23.length; i++) {
    const a = all23[i];
    const isGenerated = true;
    const isPublished = Boolean(a.publishedAt);
    
    // Check media
    const rawHero = a.rawHeroImageUrl || a.heroImageUrl || "";
    const resolvedHero = a.resolvedHeroImageUrl || extractVerifiedRealMediaUrl(a) || rawHero;
    const cleanMedia = isCleanRightsEligibleMedia(resolvedHero);
    const verifiedReal = hasVerifiedRealMedia(resolvedHero);
    const rejCheck = isRejectedImageUrl(resolvedHero);
    const mediaPass = cleanMedia && verifiedReal && !rejCheck.rejected;

    // Check tags / category
    const tags = Array.isArray(a.tags) ? a.tags : [];
    const catRes = resolveCanonicalCategories({
      headline: a.headline,
      summary: a.summary || "",
      body: a.article_body || "",
      tags,
    });
    const categoryPass = catRes.categories.length > 0;

    // Check district
    const districtRes = resolveCanonicalStoryDistrict({
      headline: a.headline,
      summary: a.summary || "",
      section: tags[0] || "chhattisgarh",
      tags,
    });
    const districtPass = Boolean(districtRes.districtSlug || districtRes.isStatewide || tags.includes("chhattisgarh"));

    // Check live queue
    const inLiveHi = queueHiMap.has(a.id);
    const inLiveEn = queueEnMap.has(a.id);
    const liveEligible = inLiveHi;

    // Check Hindi & English parity
    const hiStory = queueHiMap.get(a.id);
    const enStory = queueEnMap.get(a.id);

    // Exclusion diagnosis if not in live queue
    let exclusionStage = null;
    let reason = null;

    if (!isPublished) {
      exclusionStage = "publication";
      reason = "not_published";
    } else if (!mediaPass) {
      exclusionStage = "media_validation";
      reason = `media_rejected:${rejCheck.reason || (cleanMedia ? "unverified" : "not_clean")}`;
    } else {
      // Check CG-only rule
      const text = `${a.headline} ${a.summary || ""}`.toLowerCase();
      if (
        (text.includes("पश्चिम बंगाल") || text.includes("जम्मू-कश्मीर") || text.includes("पंजाब") || text.includes("केरल") || text.includes("तमिलनाडु")) &&
        !text.includes("छत्तीसगढ़") && !text.includes("chhattisgarh") && !districtRes.districtSlug
      ) {
        exclusionStage = "broadcast_eligibility";
        reason = "isChhattisgarhOnlyStory_hard_ban (non-CG state mentioned without CG link)";
      } else {
        const isCgSection = tags.includes("chhattisgarh") || tags.includes("raipur");
        const hasCgMention =
          /छत्तीसगढ़|रायपुर|दुर्ग|भिलाई|बिलासपुर|बस्तर|सरगुजा|कोरबा|धमतरी|chhattisgarh/i.test(text) ||
          Boolean(districtRes.districtSlug) ||
          isCgSection;
        if (!hasCgMention) {
          exclusionStage = "broadcast_eligibility";
          reason = "isChhattisgarhOnlyStory_no_cg_link (lacks CG keyword, CG section tag, or CG district)";
        } else if (!liveEligible) {
          exclusionStage = "live_queue";
          reason = "broadcast_queue_unclassified_filter";
        }
      }
    }

    results.push({
      batch: i < 17 ? "Batch 2" : "Batch 1",
      batchIndex: i < 17 ? 17 - i : 23 - i,
      id: a.id,
      eventId: a.eventId,
      headline: a.headline,
      headlineEn: enStory?.headline || a.editorialMetadata?.translations?.en?.headline || "N/A",
      isGenerated,
      isPublished,
      mediaPass,
      categoryPass,
      districtPass,
      districtSlug: districtRes.districtSlug || null,
      liveEligible,
      inLiveHi,
      inLiveEn,
      rawHero,
      resolvedHero,
      exclusionStage: liveEligible ? "NONE (LIVE)" : exclusionStage,
      reason: liveEligible ? "LIVE_ELIGIBLE" : reason,
    });
  }

  fs.writeFileSync("scripts/forensic_23_full_results.json", JSON.stringify(results, null, 2));
  console.log("Saved forensic analysis of 23 articles to scripts/forensic_23_full_results.json");
}

main().catch(console.error);
