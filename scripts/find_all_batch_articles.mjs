import fs from "fs";

// Let's inspect the 30 articles in reconcile_output or query the endpoint for 50 articles
async function main() {
  const res = await fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi");
  const data = await res.json();
  const queue = data.queue;

  console.log(`Live broadcast queue total: ${queue.length}`);
  
  // Let's load reconcile_output.json
  const rec = JSON.parse(fs.readFileSync("scripts/reconcile_output.json", "utf8"));
  const table = rec.reconciliation.table;

  console.log("\n=== ANALYSIS OF 23 RECENT ARTICLES ===");
  table.forEach((r, idx) => {
    const inQueue = queue.some(q => q.id === r.id);
    console.log(`[${idx + 1}] ID: ${r.id} | Created: ${r.createdAt} | InLiveQueue: ${inQueue} | MediaPass: ${r.mediaPass}`);
    console.log(`    Headline: ${r.headline}`);
    console.log(`    Hero: ${r.heroImageUrl}`);
  });
}

main().catch(console.error);
