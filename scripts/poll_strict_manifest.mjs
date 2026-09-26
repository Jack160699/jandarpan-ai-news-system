async function pollDeployment() {
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      const res = await fetch("https://www.jandarpan.news/api/ops/editorial-batch?action=select_batch&size=20", {
        headers: { "Cache-Control": "no-cache" }
      });
      const data = await res.json();
      const selected = data.selection?.selected || [];
      // If there are no items with "NO-DISTRICT" and no badges, the new filters are live!
      const hasBadgesOrNoDist = selected.some(s => !s.districtSlug || /badge|schema|chatgpt/i.test(s.imageUrl));
      if (!hasBadgesOrNoDist && selected.length >= 10) {
        console.log(`[Attempt ${attempt}] Deployment LIVE with pure clean regional candidates!`);
        console.log("Total eligible with real media:", data.selection?.totalEligibleWithRealMedia);
        console.log("Selected candidates count:", selected.length);
        selected.forEach((s, idx) => {
          console.log(`\n[${idx + 1}] Event: ${s.eventId}`);
          console.log(`    Title: ${s.title}`);
          console.log(`    District: ${s.districtSlug} (${s.districtNameHi} / ${s.districtNameEn})`);
          console.log(`    Categories: ${s.canonicalCategories?.join(", ")}`);
          console.log(`    Image: ${s.imageUrl}`);
        });
        return;
      } else {
        console.log(`[Attempt ${attempt}] Waiting for new build (hasBadgesOrNoDist: ${hasBadgesOrNoDist}, count: ${selected.length})...`);
      }
    } catch (e) {
      console.log(`[Attempt ${attempt}] Error: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
}
pollDeployment().catch(console.error);
