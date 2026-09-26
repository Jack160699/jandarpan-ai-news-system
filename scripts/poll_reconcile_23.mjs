async function pollReconcile() {
  for (let i = 1; i <= 20; i++) {
    try {
      const res = await fetch("https://www.jandarpan.news/api/ops/editorial-batch?action=reconcile_23", {
        headers: { "Cache-Control": "no-cache" }
      });
      const data = await res.json();
      if (data.ok && data.reconciliation) {
        console.log(`[Attempt ${i}] SUCCESS! Reconciliation data received:`);
        const rec = data.reconciliation;
        console.log("Summary:", {
          totalNewlyGenerated: rec.totalNewlyGenerated,
          totalPublished: rec.totalPublished,
          totalMediaPass: rec.totalMediaPass,
          totalInLiveQueue: rec.totalInLiveQueue,
        });

        console.log("\nSet Differences:");
        console.log("Published - CleanMedia:", rec.setDifferences?.publishedNotClean);
        console.log("CleanMedia - Live:", rec.setDifferences?.cleanNotLive);
        console.log("Published - Live:", rec.setDifferences?.publishedNotLive);

        console.log("\n=== CANONICAL STORY RECONCILIATION TABLE ===");
        console.table(rec.table.map((r, idx) => ({
          idx: idx + 1,
          id: r.id,
          headline: r.headline?.slice(0, 40),
          gen: r.generated,
          pub: r.published,
          media: r.mediaPass,
          cat: r.categoryPass,
          dist: r.districtPass,
          live: r.liveEligible,
          reason: r.reason || "LIVE_ELIGIBLE",
        })));

        console.log("\n=== FULL DETAILS FOR PUBLISHED BUT NOT LIVE STORIES ===");
        (rec.setDifferences?.publishedNotLive || []).forEach((item, idx) => {
          console.log(`\n[Missing ${idx + 1}] ID: ${item.id}`);
          console.log(`   Headline: ${item.headline}`);
          console.log(`   Reason: ${item.reason}`);
          console.log(`   Hero Image: ${item.heroImageUrl}`);
        });

        return;
      } else {
        console.log(`[Attempt ${i}] Waiting for deployment...`);
      }
    } catch (e) {
      console.log(`[Attempt ${i}] Error: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
}
pollReconcile().catch(console.error);
