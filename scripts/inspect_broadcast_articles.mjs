import https from 'https';

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    });
  });
}

async function main() {
  const feed = await fetchJson('https://www.jandarpan.news/api/broadcast/feed?lang=hi');
  if (!feed?.queue) return;
  console.log(`Checking ${feed.queue.length} stories from broadcast feed:`);
  for (const item of feed.queue) {
    const art = await fetchJson(`https://www.jandarpan.news/api/editorial/article/${item.id}`);
    if (art) {
      console.log(`Slug: ${item.slug} | Tags: ${JSON.stringify(art.tags)} | Geo: ${JSON.stringify(art.geo_metadata?.districts || art.geo_metadata?.primary_district)} | Hero: ${art.hero_image_url ? 'yes' : 'no'}`);
    } else {
      console.log(`Slug: ${item.slug} | (No editorial/article API)`);
    }
  }
}

main();
