async function countCgCandidates() {
  const res = await fetch("https://www.jandarpan.news/api/ops/editorial-batch?action=select_batch&size=200");
  const data = await res.json();
  const candidates = data.selection?.selected || [];
  console.log("Total selected with real media & CG match:", candidates.length);
  candidates.slice(0, 30).forEach((c, idx) => {
    console.log(`[${idx+1}] [${c.districtSlug}] ${c.title.slice(0, 50)}...`);
  });
}
countCgCandidates().catch(console.error);
