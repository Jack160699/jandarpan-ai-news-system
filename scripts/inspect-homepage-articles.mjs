async function test() {
  const res = await fetch("https://www.jandarpan.news/api/homepage/live");
  const data = await res.json();
  if (!data.ok || !data.snapshot) {
    console.log("No snapshot");
    return;
  }
  const snap = data.snapshot;
  const allArticles = [
    ...(snap.breakingTicker || []),
    ...(snap.liveWire || []),
    ...(snap.trending || []),
    ...(snap.localBreakingAlerts || [])
  ];
  console.log("Total articles in snapshot pools:", allArticles.length);

  const now = Date.now();
  const cutoff = now - 48 * 3600 * 1000;
  let within48h = 0;
  let older48h = 0;

  const seen = new Set();
  const uniqueArticles = [];
  for (const a of allArticles) {
    if (!a?.id || seen.has(a.id)) continue;
    seen.add(a.id);
    uniqueArticles.push(a);

    const pub = new Date(a.publishedAt).getTime();
    if (pub >= cutoff) {
      within48h++;
    } else {
      older48h++;
    }
  }

  console.log(`Unique articles: ${uniqueArticles.length}`);
  console.log(`Published within last 48h: ${within48h}`);
  console.log(`Older than 48h: ${older48h}`);

  console.log("\nArticle breakdown:");
  uniqueArticles.forEach((a, i) => {
    const pub = new Date(a.publishedAt).getTime();
    const hoursAgo = ((now - pub) / 3600000).toFixed(1);
    console.log(`${i + 1}. [${a.id}] (${hoursAgo}h ago) ${a.headline.slice(0, 70)}...`);
  });
}
test().catch(console.error);
