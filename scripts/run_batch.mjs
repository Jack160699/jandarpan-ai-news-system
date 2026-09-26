async function runBatch(size, offset) {
  console.log(`\n=======================================================`);
  console.log(`TRIGGERING PRODUCTION BATCH (size=${size}, offset=${offset})...`);
  console.log(`=======================================================`);
  const startTime = Date.now();
  
  const res = await fetch("https://www.jandarpan.news/api/ops/editorial-batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    },
    body: JSON.stringify({ action: "run_batch", size, offset })
  });

  const data = await res.json();
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Batch finished in ${elapsedSec}s. HTTP Status: ${res.status}`);

  if (!data.ok) {
    console.error("Batch error:", data.error || data);
    return null;
  }

  const result = data.result;
  console.log("\nSTAGE SUMMARY (FUNNEL):");
  console.table(result.funnel);
  console.log("New Pipeline Media Rejection:", result.newPipelineMediaRejections);
  console.log("Clean-Media Live Yield:", `${result.yieldPercent}%`);

  console.log("\nDATABASE COUNTS:");
  console.log("Before:", result.before);
  console.log("After:", result.after);
  console.log("Net new published:", result.after?.netNewPublished);

  console.log("\nFAILURES:", result.failures?.length || 0);
  if (result.failures?.length) {
    console.log(result.failures);
  }

  console.log("\nPROCESSED ITEMS:");
  (result.items || []).forEach((item, idx) => {
    console.log(`\n[${offset + idx + 1}] Event: ${item.eventId}`);
    console.log(`    Headline: ${item.headline}`);
    console.log(`    District: ${item.district}`);
    console.log(`    Categories: ${item.categories?.join(", ")}`);
    console.log(`    Hero Image: ${item.heroImageUrl}`);
    console.log(`    Clean Media: ${item.hasCleanMedia}`);
    console.log(`    Live Eligible: ${item.liveEligible}`);
    console.log(`    Languages: Hi: ${Boolean(item.headlineHi)}, En: ${Boolean(item.headlineEn)}`);
  });

  return result;
}

async function main() {
  const argSize = Number(process.argv[2]) || 10;
  const argOffset = Number(process.argv[3]) || 0;
  await runBatch(argSize, argOffset);
}

main().catch(console.error);
