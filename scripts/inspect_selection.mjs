async function inspectSelection() {
  const res = await fetch("https://www.jandarpan.news/api/ops/editorial-batch?action=select_batch&size=50");
  const data = await res.json();
  console.log("Selected candidates:", data.selection?.selected?.length);
  const selected = data.selection?.selected || [];
  
  let cgCount = 0;
  let nationalCount = 0;
  let badgeCount = 0;
  
  selected.forEach((s, idx) => {
    const isBadge = /badge/i.test(s.imageUrl);
    if (isBadge) badgeCount++;
    if (s.districtSlug) cgCount++;
    else nationalCount++;
    console.log(`[${idx + 1}] [${s.districtSlug || 'NO-DISTRICT'}] ${s.title.slice(0, 60)}...`);
    console.log(`     Img: ${s.imageUrl}`);
  });
  
  console.log({ cgCount, nationalCount, badgeCount });
}
inspectSelection().catch(console.error);
