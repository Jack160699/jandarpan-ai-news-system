async function verifyArticles() {
  const [resHi, resEn] = await Promise.all([
    fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi"),
    fetch("https://www.jandarpan.news/api/broadcast/feed?lang=en")
  ]);
  const dataHi = await resHi.json();
  const dataEn = await resEn.json();
  
  console.log(`Verified ${dataHi.queue.length} Hindi stories and ${dataEn.queue.length} English stories.`);
  
  // Sample 5 recent stories
  const sample = dataHi.queue.slice(0, 5);
  sample.forEach((s, idx) => {
    const en = dataEn.queue.find(e => e.id === s.id);
    console.log(`\n================== STORY [${idx+1}] ==================`);
    console.log(`ID: ${s.id}`);
    console.log(`HI Headline: ${s.headline}`);
    console.log(`EN Headline: ${en?.headline}`);
    console.log(`HI Summary: ${s.summary?.slice(0, 80)}...`);
    console.log(`EN Summary: ${en?.summary?.slice(0, 80)}...`);
    console.log(`District: ${s.district}`);
    console.log(`Category: ${s.category}`);
    console.log(`Image: ${s.imageUrl}`);
    console.log(`Spoken Script HI: ${s.spokenScript?.slice(0, 70)}...`);
    console.log(`Spoken Script EN: ${en?.spokenScript?.slice(0, 70)}...`);
  });
}
verifyArticles().catch(console.error);
