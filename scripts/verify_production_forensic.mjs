import { chromium } from "playwright";
import fs from "node:fs";

async function verifyProduction() {
  console.log("=== Jan Darpan Production Forensic Verification ===");
  const now = Date.now();

  // 1. Fetch Production Live Feeds in both languages
  const resHi = await fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi", { cache: "no-store" });
  const dataHi = await resHi.json();
  const queueHi = dataHi.queue || [];

  const resEn = await fetch("https://www.jandarpan.news/api/broadcast/feed?lang=en", { cache: "no-store" });
  const dataEn = await resEn.json();
  const queueEn = dataEn.queue || [];

  console.log(`Feed status: Hindi=${queueHi.length}, English=${queueEn.length}`);
  if (queueHi.length === 0) {
    console.error("Queue is empty!");
    return;
  }

  // Check if new deployment with districtSlug is live
  const hasDistrictSlug = queueHi.some(s => s.districtSlug !== undefined);
  console.log(`Deployment status: districtSlug present = ${hasDistrictSlug}`);

  // 17.1: 30-DAY DATASET METRICS
  const ageBuckets = {
    "0-1 day": 0,
    "2-3 days": 0,
    "4-7 days": 0,
    "8-14 days": 0,
    "15-21 days": 0,
    "22-30 days": 0,
  };

  const dates = [];
  for (const s of queueHi) {
    const pubTime = new Date(s.publishedAt).getTime();
    dates.push({ id: s.id, publishedAt: s.publishedAt, pubTime });
    const ageDays = (now - pubTime) / (24 * 3600 * 1000);
    if (ageDays <= 1) ageBuckets["0-1 day"]++;
    else if (ageDays <= 3) ageBuckets["2-3 days"]++;
    else if (ageDays <= 7) ageBuckets["4-7 days"]++;
    else if (ageDays <= 14) ageBuckets["8-14 days"]++;
    else if (ageDays <= 21) ageBuckets["15-21 days"]++;
    else if (ageDays <= 30) ageBuckets["22-30 days"]++;
  }

  dates.sort((a, b) => a.pubTime - b.pubTime);
  const oldestStory = dates[0];
  const newestStory = dates[dates.length - 1];

  console.log("\n--- 30-DAY DATASET METRICS ---");
  console.log("Total canonical stories in live queue:", queueHi.length);
  console.log("Oldest story in queue:", oldestStory.id, oldestStory.publishedAt, `(${(now - oldestStory.pubTime)/(24*3600*1000)} days ago)`);
  console.log("Newest story in queue:", newestStory.id, newestStory.publishedAt);
  console.table(ageBuckets);

  // 17.2: LANGUAGE PARITY METRICS
  const hiIds = queueHi.map(s => s.id);
  const enIds = queueEn.map(s => s.id);
  const hiSet = new Set(hiIds);
  const enSet = new Set(enIds);
  const missingInEn = hiIds.filter(id => !enSet.has(id));
  const missingInHi = enIds.filter(id => !hiSet.has(id));

  console.log("\n--- LANGUAGE PARITY ---");
  console.log("Hindi canonical IDs count:", hiIds.length);
  console.log("English canonical IDs count:", enIds.length);
  console.log("Missing in English:", missingInEn.length, missingInEn);
  console.log("Missing in Hindi:", missingInHi.length, missingInHi);

  // 17.3: CATEGORY DISTRIBUTION
  const categoryCounts = {
    "सभी": queueHi.length,
    "क्राइम": 0,
    "राजनीति": 0,
    "राष्ट्रीय": 0,
    "छत्तीसगढ़": 0,
    "बाज़ार": 0,
    "प्रशासन": 0,
  };

  for (const s of queueHi) {
    const cats = s.canonicalCategories || [];
    if (cats.includes("crime")) categoryCounts["क्राइम"]++;
    if (cats.includes("politics")) categoryCounts["राजनीति"]++;
    if (cats.includes("national")) categoryCounts["राष्ट्रीय"]++;
    if (cats.includes("chhattisgarh")) categoryCounts["छत्तीसगढ़"]++;
    if (cats.includes("business")) categoryCounts["बाज़ार"]++;
    if (cats.includes("governance")) categoryCounts["प्रशासन"]++;
  }

  console.log("\n--- CATEGORY DISTRIBUTION (सभी & CANONICAL CATEGORIES) ---");
  console.table(categoryCounts);

  // 17.4: DISTRICT REORDERING TEST (API LEVEL)
  const districts = ["raipur", "durg", "bilaspur", "rajnandgaon"];
  console.log("\n--- DISTRICT PRIORITIZATION (API / CLIENT ENGINE) ---");
  // Test with local categories prioritizing engine
  const { getPrioritizedStories } = await import("../src/features/jd-live/lib/categories.ts");
  
  for (const d of districts) {
    const prioritizedHi = getPrioritizedStories(queueHi, "all", d);
    const prioritizedEn = getPrioritizedStories(queueEn, "all", d);

    const first3Hi = prioritizedHi.slice(0, 3).map(s => ({ id: s.id.slice(0, 15), dist: s.district, slug: s.districtSlug }));
    const first3En = prioritizedEn.slice(0, 3).map(s => ({ id: s.id.slice(0, 15), dist: s.district, slug: s.districtSlug }));

    console.log(`District: ${d.toUpperCase()}`);
    console.log("  Hindi first 3:", first3Hi);
    console.log("  English first 3:", first3En);
    const sameIds = first3Hi.every((s, idx) => s.id === first3En[idx]?.id);
    console.log("  Order invariant identical:", sameIds);
  }

  // 18: ARTICLE CONTENT INSPECTION (Story 22 & representative stories)
  console.log("\n--- ARTICLE CONTENT INSPECTION (STORY 22) ---");
  const story22 = queueHi.find(s => s.id === "b29dab70-9918-4145-92f9-6bf0743b99c6") || queueHi[queueHi.length - 1];
  console.log({
    id: story22.id,
    headline: story22.headline,
    script: story22.script,
    hasEllipsis: /[\u2026]|\.{3,}/.test(story22.script),
    durationSec: story22.durationSec,
    district: story22.district,
    districtSlug: story22.districtSlug,
    imageUrl: story22.imageUrl,
    categories: story22.canonicalCategories,
  });

  return { hasDistrictSlug, total: queueHi.length, ageBuckets, missingInEn, missingInHi, categoryCounts };
}

verifyProduction().catch(console.error);
