async function main() {
  const res = await fetch("https://www.jandarpan.news/api/ops/editorial-batch?action=select_batch&size=20");
  const data = await res.json();
  if (!data.ok) {
    console.error("Error:", data.error);
    return;
  }
  console.log("Total eligible with real media:", data.selection.totalEligibleWithRealMedia);
  console.log("Selected candidates:", data.selection.selected.length);
  data.selection.selected.forEach((s, idx) => {
    console.log(`[${idx + 1}] Event: ${s.eventId}`);
    console.log(`    Title: ${s.title}`);
    console.log(`    District: ${s.districtSlug} (${s.districtNameHi} / ${s.districtNameEn})`);
    console.log(`    Categories: ${s.canonicalCategories.join(", ")}`);
    console.log(`    Score: ${s.score} (${s.reasons.join(", ")})`);
    console.log(`    Real Media Image: ${s.imageUrl}`);
    console.log("-------------------------------------------------------------------");
  });
}
main().catch(console.error);
