async function main() {
  const res = await fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi");
  const data = await res.json();
  const stories = data.queue.filter(s => !s.isIntro);
  console.log("Total live stories:", stories.length);
  const now = Date.now();
  const ages = stories.map(s => {
    const ms = now - new Date(s.publishedAt).getTime();
    return Math.round(ms / 3600000);
  });
  console.log("Min age (hours):", Math.min(...ages));
  console.log("Max age (hours):", Math.max(...ages));
  console.log("Under 24h:", ages.filter(a => a <= 24).length);
  console.log("24h - 48h:", ages.filter(a => a > 24 && a <= 48).length);
  console.log("48h - 7d:", ages.filter(a => a > 48 && a <= 168).length);
  console.log("7d - 30d:", ages.filter(a => a > 168 && a <= 720).length);
  console.log("> 30d (rejected):", ages.filter(a => a > 720).length);
}

main().catch(console.error);
