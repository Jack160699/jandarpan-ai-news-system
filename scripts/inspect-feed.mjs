async function test() {
  const url = "https://www.jandarpan.news/api/broadcast/feed?lang=hi";
  const res = await fetch(url);
  const data = await res.json();
  console.log("Feed status:", res.status);
  console.log("Queue length:", data.queue ? data.queue.length : 0);
  console.log("Breaking length:", data.breaking ? data.breaking.length : 0);
  console.log("\n--- Top Stories ---");
  for (let i = 0; i < Math.min(15, data.queue.length); i++) {
    const s = data.queue[i];
    console.log(`${i + 1}. [${s.id}] District: ${s.district} | Published: ${s.publishedAt}`);
    console.log(`   Headline: ${s.headline}`);
    console.log(`   Category: ${s.categoryLabel} | Image: ${s.imageUrl ? "YES" : "NO"}`);
  }
}
test().catch(console.error);
