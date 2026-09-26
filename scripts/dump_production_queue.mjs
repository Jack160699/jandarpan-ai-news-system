import fs from "node:fs";

async function dumpCurrentPool() {
  const res = await fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi", { cache: "no-store" });
  const data = await res.json();
  const queue = data.queue || [];
  
  console.log(`Fetched ${queue.length} production queue articles.`);
  const articles = queue.map((s, idx) => ({
    index: idx + 1,
    id: s.id,
    headline: s.headline,
    district: s.district,
    districtSlug: s.districtSlug,
    section: s.section,
    primaryCategory: s.primaryCategory,
    canonicalCategories: s.canonicalCategories,
    summary: s.summary,
    imageUrl: s.imageUrl,
    durationSec: s.durationSec,
  }));

  fs.writeFileSync("scripts/production_queue_dump.json", JSON.stringify(articles, null, 2), "utf-8");
  console.log("Wrote scripts/production_queue_dump.json");
}

dumpCurrentPool().catch(console.error);
