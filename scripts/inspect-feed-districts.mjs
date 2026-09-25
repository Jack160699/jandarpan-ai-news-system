import https from 'https';

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    });
  });
}

async function main() {
  const feed = await fetchJson('https://www.jandarpan.news/api/broadcast/feed?lang=hi');
  if (!feed || !feed.queue) {
    console.log('No feed returned');
    return;
  }
  console.log(`Feed queue size: ${feed.queue.length}`);
  feed.queue.forEach((item, idx) => {
    console.log(`${idx + 1}. [${item.location || 'no-location'}] ${item.headline?.slice(0, 50)}`);
    console.log(`   slug: ${item.slug}, media: ${item.mediaUrl?.slice(0, 60)}`);
  });
}

main();
