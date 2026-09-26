import fs from "fs";

const d = JSON.parse(fs.readFileSync("scripts/reconcile_full_dump.json", "utf8"));
const table = d.reconciliation.table;

// Items 2 to 24 (index 1 to 23 in 0-indexed array)
const batch23 = table.slice(1, 24);

console.log("Total articles in Batch 1 + 2:", batch23.length);

const batch1 = batch23.slice(17, 23); // Items 19 to 24 (6 items)
const batch2 = batch23.slice(0, 17);  // Items 2 to 18 (17 items)

console.log("Batch 1 count:", batch1.length);
console.log("Batch 2 count:", batch2.length);

fs.writeFileSync("scripts/batch_23_exact.json", JSON.stringify({
  batch1,
  batch2,
  all23: batch23
}, null, 2));

console.log("\n=== BATCH 1 (6 ARTICLES) ===");
batch1.forEach((r, idx) => {
  console.log(`[B1-${idx + 1}] ID: ${r.id} | Event: ${r.eventId}`);
  console.log(`      Headline: ${r.headline}`);
  console.log(`      Live: ${r.liveEligible} | MediaPass: ${r.mediaPass} | Reason: ${r.reason || "LIVE_OK"}`);
  console.log(`      Hero: ${r.heroImageUrl}`);
  console.log(`      District: ${r.districtSlug}`);
});

console.log("\n=== BATCH 2 (17 ARTICLES) ===");
batch2.forEach((r, idx) => {
  console.log(`[B2-${idx + 1}] ID: ${r.id} | Event: ${r.eventId}`);
  console.log(`      Headline: ${r.headline}`);
  console.log(`      Live: ${r.liveEligible} | MediaPass: ${r.mediaPass} | Reason: ${r.reason || "LIVE_OK"}`);
  console.log(`      Hero: ${r.heroImageUrl}`);
  console.log(`      District: ${r.districtSlug}`);
});
