import fs from "fs";

async function main() {
  const res = await fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi", {
    headers: { "Cache-Control": "no-cache" }
  });
  const data = await res.json();
  const queue = data.queue;
  console.log(`Current live broadcast queue total: ${queue.length}`);

  const batchData = JSON.parse(fs.readFileSync("scripts/batch_23_exact.json", "utf8"));
  const batch23Ids = new Set(batchData.all23.map(r => r.id));
  const batch1Ids = new Set(batchData.batch1.map(r => r.id));
  const batch2Ids = new Set(batchData.batch2.map(r => r.id));

  const fromBatch1 = queue.filter(q => batch1Ids.has(q.id));
  const fromBatch2 = queue.filter(q => batch2Ids.has(q.id));
  const fromOlder = queue.filter(q => !batch23Ids.has(q.id));

  console.log(`In Queue from Batch 1: ${fromBatch1.length} / ${batch1Ids.size}`);
  console.log(`In Queue from Batch 2: ${fromBatch2.length} / ${batch2Ids.size}`);
  console.log(`In Queue from Older pool: ${fromOlder.length}`);

  console.log("\n--- BATCH 1 ITEMS IN QUEUE ---");
  fromBatch1.forEach(q => console.log(`  ${q.id} | ${q.headline.slice(0, 45)}`));

  console.log("\n--- BATCH 2 ITEMS IN QUEUE ---");
  fromBatch2.forEach(q => console.log(`  ${q.id} | ${q.headline.slice(0, 45)}`));

  console.log("\n--- BATCH 2 ITEMS NOT IN QUEUE ---");
  const batch2NotInQueue = batchData.batch2.filter(b => !queue.some(q => q.id === b.id));
  batch2NotInQueue.forEach(b => console.log(`  ${b.id} | Reason: ${b.reason} | ${b.headline.slice(0, 45)}`));
}

main().catch(console.error);
