import fs from "fs";

async function main() {
  const res = await fetch("https://www.jandarpan.news/api/ops/editorial-batch?action=reconcile_23", {
    headers: { "Cache-Control": "no-cache" }
  });
  const data = await res.json();
  fs.writeFileSync("scripts/reconcile_output.json", JSON.stringify(data, null, 2));
  console.log("Saved reconciliation output to scripts/reconcile_output.json");
  
  const rec = data.reconciliation;
  console.log("Total newly generated rows:", rec.totalNewlyGenerated);
  console.log("Total published:", rec.totalPublished);
  console.log("Total media pass:", rec.totalMediaPass);
  console.log("Total in live queue:", rec.totalInLiveQueue);
  console.log("Published Not Clean count:", rec.setDifferences?.publishedNotClean?.length);
  console.log("Clean Not Live count:", rec.setDifferences?.cleanNotLive?.length);
  console.log("Published Not Live count:", rec.setDifferences?.publishedNotLive?.length);
}

main().catch(console.error);
