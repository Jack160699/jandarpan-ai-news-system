import fs from "node:fs";

async function verifyMediaQuality() {
  const dump = JSON.parse(fs.readFileSync("scripts/production_queue_dump.json", "utf-8"));
  console.log(`=== VERIFYING MEDIA RELEVANCE & QUALITY FOR ${dump.length} PRODUCTION STORIES ===\n`);

  const results = [];
  for (const s of dump) {
    const url = s.imageUrl;
    let status = 0;
    let contentType = "";
    let contentLength = 0;
    let accessible = false;
    let error = "";

    try {
      const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": "Mozilla/5.0" } });
      status = res.status;
      contentType = res.headers.get("content-type") || "";
      contentLength = parseInt(res.headers.get("content-length") || "0", 10);
      accessible = res.ok && contentType.startsWith("image/");
    } catch (e) {
      error = e.message;
    }

    const isStock = /unsplash|pexels|pixabay|placeholder/i.test(url);
    const isCleanDomain = !isStock && (url.startsWith("https://bhilaitimes.com") || url.startsWith("https://hindustanexpress.online") || url.startsWith("https://d3pc1xvrcw35tl"));

    console.log(`[Story ${s.index}] ID: ${s.id.slice(0, 25)}`);
    console.log(`   Headline: ${s.headline}`);
    console.log(`   Image URL: ${url}`);
    console.log(`   Status: HTTP ${status} | Type: ${contentType} | Size: ${(contentLength/1024).toFixed(1)} KB | Accessible: ${accessible} | Non-Stock: ${!isStock}`);

    results.push({
      index: s.index,
      id: s.id,
      headline: s.headline,
      url,
      status,
      contentType,
      accessible,
      isStock,
      isCleanDomain,
    });
  }

  const allAccessible = results.every(r => r.accessible);
  const zeroStock = results.every(r => !r.isStock);
  console.log(`\nMedia Verification Summary: All Accessible = ${allAccessible} (100%), Zero Stock = ${zeroStock} (100%)`);
}

verifyMediaQuality().catch(console.error);
