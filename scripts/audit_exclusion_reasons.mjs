import fs from "node:fs";

const TARGET_URL = "https://www.jandarpan.news";

async function run() {
  const feedRes = await fetch(`${TARGET_URL}/api/broadcast/feed?lang=hi`);
  const feedData = await feedRes.json();
  const queueIds = new Set((feedData.queue || []).map((s) => s.id));
  const breakingIds = new Set((feedData.breaking || []).map((s) => s.id));

  const regRes = await fetch(`${TARGET_URL}/api/regional/feed`);
  const regData = await regRes.json();

  const regionalStories = [];
  for (const f of regData.feeds || []) {
    for (const a of f.articles || []) {
      regionalStories.push({ ...a, districtFoundIn: f.districtSlug });
    }
  }

  console.log("=================================================");
  console.log("EXCLUSION REASON AUDIT: REGIONAL VS LIVE QUEUE");
  console.log("=================================================");

  const excluded = [];
  for (const r of regionalStories) {
    if (!queueIds.has(r.id) && !breakingIds.has(r.id)) {
      excluded.push(r);
    }
  }

  console.log(`Total excluded from Live queue: ${excluded.length}`);

  for (const a of excluded) {
    const img = a.imageUrl || a.hero_image_url || a.image_url;
    const pub = a.publishedAt || a.published_at;
    const pubDate = new Date(pub);
    const now = Date.now();
    const ageDays = (now - pubDate.getTime()) / (24 * 3600 * 1000);

    const reasons = [];
    if (!img) reasons.push("MISSING_IMAGE");
    if (img && img.includes("placeholder")) reasons.push("PLACEHOLDER_IMAGE");
    if (isNaN(pubDate.getTime())) reasons.push("INVALID_DATE");
    if (ageDays > 30) reasons.push("OLDER_THAN_30_DAYS");
    if (ageDays < -0.1) reasons.push("FUTURE_DATE");

    console.log(`\nID: ${a.id}`);
    console.log(`  Headline: "${a.headline?.slice(0, 50)}..."`);
    console.log(`  District: ${a.districtFoundIn}`);
    console.log(`  Pub Date: ${pub} (${ageDays.toFixed(1)} days ago)`);
    console.log(`  Image: ${img?.slice(0, 70)}...`);
    console.log(`  Apparent Rejection Reasons: ${reasons.length ? reasons.join(", ") : "PASSED BASE CHECKS - Likely dropped by candidate pool query or media filter"}`);
  }
}

run();
