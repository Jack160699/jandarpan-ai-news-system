async function run() {
  const feedRes = await fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi");
  const feedData = await feedRes.json();
  console.log("Broadcast Feed Meta:", feedData.meta);
  console.log("Broadcast Queue Length:", feedData.queue?.length);
  if (feedData.queue?.length > 0) {
    const dates = feedData.queue.map(q => q.publishedAt).filter(Boolean);
    console.log("Newest date:", dates[0]);
    console.log("Oldest date:", dates[dates.length - 1]);
    console.log("Sample items (first 5):");
    feedData.queue.slice(0, 5).forEach((q, i) => {
      console.log(`${i+1}. [${q.publishedAt}] [${q.district || q.categoryLabel}] ${q.headline?.slice(0, 50)}`);
    });
  }
}
run().catch(console.error);
