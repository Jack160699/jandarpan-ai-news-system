async function printExact23() {
  const res = await fetch("https://www.jandarpan.news/api/ops/editorial-batch?action=reconcile_23", {
    headers: { "Cache-Control": "no-cache" }
  });
  const data = await res.json();
  const rec = data.reconciliation;
  
  console.log("=== ALL 23 RECENT ARTICLES ===");
  rec.table.forEach((r, idx) => {
    console.log(`[${idx + 1}] ID: ${r.id}`);
    console.log(`    Headline: ${r.headline}`);
    console.log(`    Event ID: ${r.eventId}`);
    console.log(`    Created At: ${r.createdAt} | Published At: ${r.publishedAt}`);
    console.log(`    Hero Image: ${r.heroImageUrl}`);
    console.log(`    Media Pass: ${r.mediaPass}`);
    console.log(`    District: ${r.districtSlug} | Tags: ${r.tags?.join(", ")}`);
    console.log(`    Live Eligible: ${r.liveEligible} (Reason: ${r.reason || "LIVE_ELIGIBLE"})`);
    console.log("-----------------------------------------------------------------");
  });
}
printExact23().catch(console.error);
