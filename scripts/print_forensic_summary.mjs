import fs from "fs";

const results = JSON.parse(fs.readFileSync("scripts/forensic_23_full_results.json", "utf8"));

console.log("=== BATCH 1 RECONCILIATION (6 ARTICLES) ===");
const b1 = results.filter(r => r.batch === "Batch 1");
console.table(b1.map((r, i) => ({
  idx: i + 1,
  id: r.id.slice(0, 8) + "...",
  gen: r.isGenerated,
  pub: r.isPublished,
  media: r.mediaPass,
  cat: r.categoryPass,
  dist: r.districtPass,
  live: r.liveEligible,
  reason: r.reason.slice(0, 35),
})));

console.log("\n=== BATCH 2 RECONCILIATION (17 ARTICLES) ===");
const b2 = results.filter(r => r.batch === "Batch 2");
console.table(b2.map((r, i) => ({
  idx: i + 1,
  id: r.id.slice(0, 8) + "...",
  gen: r.isGenerated,
  pub: r.isPublished,
  media: r.mediaPass,
  cat: r.categoryPass,
  dist: r.districtPass,
  live: r.liveEligible,
  reason: r.reason.slice(0, 35),
})));

const liveCount = results.filter(r => r.liveEligible).length;
const notLiveCount = results.filter(r => !r.liveEligible).length;

console.log("\nSUMMARY ACROSS ALL 23 ARTICLES:");
console.log(`Generated: ${results.filter(r => r.isGenerated).length}`);
console.log(`Published: ${results.filter(r => r.isPublished).length}`);
console.log(`Media Pass: ${results.filter(r => r.mediaPass).length}`);
console.log(`Category Pass: ${results.filter(r => r.categoryPass).length}`);
console.log(`District Pass: ${results.filter(r => r.districtPass).length}`);
console.log(`Live Eligible: ${liveCount}`);
console.log(`Published but NOT Live: ${notLiveCount}`);
