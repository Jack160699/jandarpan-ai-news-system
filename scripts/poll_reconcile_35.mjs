import fs from "fs";

async function pollDeployment() {
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      const res = await fetch("https://www.jandarpan.news/api/ops/editorial-batch?action=reconcile_23&limit=35", {
        headers: { "Cache-Control": "no-cache" }
      });
      const data = await res.json();
      if (data.ok && data.reconciliation?.table?.length > 25) {
        console.log(`[Attempt ${attempt}] DEPLOYMENT LIVE! Total fetched: ${data.reconciliation.table.length}`);
        fs.writeFileSync("scripts/reconcile_full_dump.json", JSON.stringify(data, null, 2));
        console.log("Saved full data to scripts/reconcile_full_dump.json");
        return data.reconciliation;
      } else {
        console.log(`[Attempt ${attempt}] Length is ${data.reconciliation?.table?.length || 0}. Waiting 6s for deployment...`);
      }
    } catch (e) {
      console.log(`[Attempt ${attempt}] Error: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
}

pollDeployment().catch(console.error);
