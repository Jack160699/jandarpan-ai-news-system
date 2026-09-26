import fs from "fs";
import {
  isCleanRightsEligibleMedia,
  hasVerifiedRealMedia,
  isRejectedImageUrl,
  extractVerifiedRealMediaUrl,
} from "../src/lib/news/images/validate.ts";
import { resolveCanonicalStoryDistrict } from "../src/lib/regional/canonical-district.ts";
import { resolveCanonicalCategories } from "../src/lib/editorial/canonical-categories.ts";
import { isWithinCanonicalReaderWindow } from "../src/lib/news/canonical-window.ts";

const CG_TEXT_SIGNALS = [
  "छत्तीसगढ़", "chhattisgarh", "रायपुर", "raipur", "दुर्ग", "durg", "भिलाई", "bhilai",
  "बिलासपुर", "bilaspur", "बस्तर", "bastar", "सरगुजा", "surguja", "कोरबा", "korba",
  "राजनांदगांव", "rajnandgaon", "जगदलपुर", "jagdalpur", "अंबिकापुर", "ambikapur",
  "धमतरी", "dhamtari", "महासमुंद", "mahasamund", "कवर्धा", "kawardha", "जांजगीर", "janjgir",
  "रायगढ़", "raigarh", "कांकेर", "kanker", "दंतेवाड़ा", "dantewada", "सुकमा", "sukma",
  "बीजापुर", "bijapur", "नारायणपुर", "narayanpur", "कोरिया", "korea", "सूरजपुर", "surajpur",
  "बलरामपुर", "balrampur", "जशपुर", "jashpur", "मुंगेली", "mungeli", "बेमेतरा", "bemetara",
  "बालोद", "balod", "बलौदाबाजार", "balodabazar", "गौरेला", "gaurela", "पेंड्रा", "pendra",
  "मरवाही", "marwahi", "सक्ती", "sakti", "सारंगढ़", "sarangarh", "बिलाईगढ़", "bilaigarh",
  "मोहला", "mohla", "मानपुर", "manpur", "खैरागढ़", "khairagarh", "छुईखदान", "chhuikhadan",
  "गंडई", "gandai", "मनेंद्रगढ़", "manendragarh", "चिरमिरी", "chirmiri", "भरतपुर", "bharatpur"
];

const CG_DISTRICT_KEYS = new Set([
  "balod", "baloda-bazar", "balrampur", "bastar", "bemetara", "bijapur",
  "bilaspur", "dantewada", "dhamtari", "durg", "gariaband", "gaurela-pendra-marwahi",
  "janjgir-champa", "jashpur", "kabirdham", "kanker", "kondagaon", "korba",
  "korea", "mahasamund", "manendragarh-chirmiri-bharatpur", "mohla-manpur-amba-chauki",
  "mungeli", "narayanpur", "raigarh", "raipur", "rajnandgaon", "sarangarh-bilaigarh",
  "sakti", "sukma", "surajpur", "surguja", "khairagarh-chhuikhadan-gandai"
]);

function isChhattisgarhOnlyStory(c) {
  const text = `${c.headline} ${c.summary || ""}`.toLowerCase();
  const hlLower = c.headline.toLowerCase();

  // Disallow generic national roundups or astrology
  if (hlLower.includes("देश-दुनिया") || hlLower.includes("राशिफल") || hlLower.includes("अंक ज्योतिष")) {
    return { pass: false, rule: "generic_national_or_astrology" };
  }

  // Purely outside states with no CG relevance
  if (
    (text.includes("पश्चिम बंगाल") || text.includes("जम्मू-कश्मीर") || text.includes("पंजाब") || text.includes("केरल") || text.includes("तमिलनाडु")) &&
    !text.includes("छत्तीसगढ़") && !text.includes("chhattisgarh") && !c.districtSlug
  ) {
    return { pass: false, rule: "outside_state_hard_ban" };
  }

  const isCgSection = c.section === "chhattisgarh" || c.section === "raipur" || c.tags?.includes("chhattisgarh");
  const hasCgMention =
    CG_TEXT_SIGNALS.some((sig) => text.includes(sig.toLowerCase())) ||
    (c.districtSlug && CG_DISTRICT_KEYS.has(c.districtSlug)) ||
    isCgSection;

  if (!hasCgMention) {
    return { pass: false, rule: "no_cg_keyword_or_district" };
  }

  return { pass: true, rule: "cg_matched" };
}

async function main() {
  const [resHi, resEn] = await Promise.all([
    fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi", { cache: "no-store" }),
    fetch("https://www.jandarpan.news/api/broadcast/feed?lang=en", { cache: "no-store" }),
  ]);
  const dataHi = await resHi.json();
  const dataEn = await resEn.json();
  const queueHi = dataHi?.queue || [];
  const queueEn = dataEn?.queue || [];

  const liveHiIds = new Set(queueHi.map((s) => s.id));
  const liveEnIds = new Set(queueEn.map((s) => s.id));

  const batchData = JSON.parse(fs.readFileSync("scripts/batch_23_exact.json", "utf8"));
  const all23 = batchData.all23;

  const stageDiagnostics = [];

  for (const a of all23) {
    const rawHero = a.rawHeroImageUrl || a.heroImageUrl || "";
    const resolvedHero = a.resolvedHeroImageUrl || extractVerifiedRealMediaUrl(a) || rawHero;

    // Stage 1: Generated
    const stage1_generated = true;

    // Stage 2: Published
    const stage2_published = Boolean(a.publishedAt);

    // Stage 3: Media Validation
    const cleanMedia = isCleanRightsEligibleMedia(resolvedHero);
    const verifiedReal = hasVerifiedRealMedia(resolvedHero);
    const rejCheck = isRejectedImageUrl(resolvedHero);
    const stage3_mediaPass = cleanMedia && verifiedReal && !rejCheck.rejected;

    // Stage 4: Category
    const tags = Array.isArray(a.tags) ? a.tags : [];
    const catRes = resolveCanonicalCategories({
      headline: a.headline,
      summary: a.summary || "",
      body: a.article_body || "",
      tags,
    });
    const stage4_categoryPass = catRes.categories.length > 0;

    // Stage 5: District
    const districtRes = resolveCanonicalStoryDistrict({
      headline: a.headline,
      summary: a.summary || "",
      section: tags[0] || "chhattisgarh",
      tags,
    });
    const stage5_districtPass = Boolean(districtRes.districtSlug || districtRes.isStatewide || tags.includes("chhattisgarh"));

    // Stage 6: Language Parity
    const hasHi = Boolean(a.headline);
    const hasEn = Boolean(a.editorialMetadata?.translations?.en?.headline || queueEn.find(q => q.id === a.id));
    const stage6_languageParity = hasHi && hasEn;

    // Stage 7: Reader Eligibility (30-day window)
    const stage7_readerWindow = isWithinCanonicalReaderWindow(a.publishedAt);

    // Stage 8: Broadcast Eligibility (Chhattisgarh Relevance)
    const cgCheck = isChhattisgarhOnlyStory({
      headline: a.headline,
      summary: a.summary || "",
      tags,
      section: tags[0] || "chhattisgarh",
      districtSlug: districtRes.districtSlug || null,
    });
    const stage8_broadcastEligibility = cgCheck.pass;

    // Stage 9: Live Queue Presence
    const stage9_liveQueueHi = liveHiIds.has(a.id);
    const stage9_liveQueueEn = liveEnIds.has(a.id);

    // Find the EXACT FIRST DIVERGENCE STAGE
    let divergenceStage = "NONE (FULL PASS)";
    let divergenceReason = "LIVE_ELIGIBLE";

    if (!stage1_generated) {
      divergenceStage = "1_generated";
      divergenceReason = "not_generated";
    } else if (!stage2_published) {
      divergenceStage = "2_published";
      divergenceReason = "not_published";
    } else if (!stage3_mediaPass) {
      divergenceStage = "3_media_validation";
      divergenceReason = `media_rejected:${rejCheck.reason || (cleanMedia ? "unverified_real" : "not_clean_rights")}`;
    } else if (!stage4_categoryPass) {
      divergenceStage = "4_category";
      divergenceReason = "category_unmatched";
    } else if (!stage5_districtPass) {
      divergenceStage = "5_district";
      divergenceReason = "district_unmatched";
    } else if (!stage7_readerWindow) {
      divergenceStage = "7_reader_eligibility";
      divergenceReason = "outside_30_day_window";
    } else if (!stage8_broadcastEligibility) {
      divergenceStage = "8_broadcast_eligibility";
      divergenceReason = `cg_filter:${cgCheck.rule}`;
    } else if (!stage9_liveQueueHi) {
      divergenceStage = "9_live_queue";
      divergenceReason = "live_queue_missing";
    }

    stageDiagnostics.push({
      id: a.id,
      eventId: a.eventId,
      headline: a.headline,
      heroImageUrl: resolvedHero,
      stages: {
        generated: stage1_generated,
        published: stage2_published,
        mediaValidation: stage3_mediaPass,
        category: stage4_categoryPass,
        district: stage5_districtPass,
        languageParity: stage6_languageParity,
        readerWindow: stage7_readerWindow,
        broadcastEligibility: stage8_broadcastEligibility,
        liveQueue: stage9_liveQueueHi,
      },
      divergenceStage,
      divergenceReason,
    });
  }

  fs.writeFileSync("scripts/stage_diagnostics_all23.json", JSON.stringify(stageDiagnostics, null, 2));

  console.log("=== STAGE-BY-STAGE DIVERGENCE AUDIT ===");
  stageDiagnostics.forEach((s, idx) => {
    console.log(`[${idx + 1}] ID: ${s.id} | First Divergence: ${s.divergenceStage}`);
    console.log(`    Headline: ${s.headline.slice(0, 50)}`);
    console.log(`    Reason: ${s.divergenceReason}`);
    console.log(`    Hero: ${s.heroImageUrl}`);
    console.log("---------------------------------------------------------------");
  });
}

main().catch(console.error);
