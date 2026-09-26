async function poll() {
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      const res = await fetch("https://www.jandarpan.news/api/ops/editorial-batch?action=select_batch&size=20", {
        headers: { "Cache-Control": "no-cache" }
      });
      const data = await res.json();
      if (data.selection?.diagnostics) {
        console.log(`[Attempt ${attempt}] Deployment LIVE!`);
        console.log("Diagnostics:", JSON.stringify(data.selection.diagnostics, null, 2));
        console.log("Total eligible with real media:", data.selection.totalEligibleWithRealMedia);
        console.log("Selected candidates count:", data.selection.selected?.length);
        data.selection.selected.slice(0, 10).forEach((s, idx) => {
          console.log(`\n[${idx + 1}] Event: ${s.eventId}`);
          console.log(`    Title: ${s.title}`);
          console.log(`    District: ${s.districtSlug} (${s.districtNameHi} / ${s.districtNameEn})`);
          console.log(`    Categories: ${s.canonicalCategories?.join(", ")}`);
          console.log(`    Real Media Image: ${s.imageUrl}`);
        });
        return;
      } else {
        console.log(`[Attempt ${attempt}] Still old deployment, waiting 5s...`);
      }
    } catch (e) {
      console.log(`[Attempt ${attempt}] Error: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}
poll().catch(console.error);
