const https = require('https');

function fetch(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, data: d }));
    }).on('error', rej);
  });
}

async function poll() {
  const targetHeadline = 'रायपुर-दुर्ग नेशनल हाईवे पर भारी जलभराव से यातायात प्रभावित';
  console.log('Polling production deployment for commit 5beac2e...');
  for (let i = 0; i < 30; i++) {
    try {
      const { status, data } = await fetch(`https://www.jandarpan.news/api/broadcast/feed?lang=hi&_t=${Date.now()}`);
      if (status === 200) {
        const json = JSON.parse(data);
        const topHl = json.queue?.[0]?.headline || '';
        console.log(`[Attempt ${i + 1}] Top Story: ${topHl.slice(0, 50)}...`);
        if (topHl.includes('रायपुर-दुर्ग नेशनल हाईवे') || topHl.includes('जलभराव')) {
          console.log('SUCCESS! Commit 5beac2e is LIVE on production!');
          console.log('Meta:', json.meta);
          console.log('Top queue segment:\n', JSON.stringify(json.queue[0], null, 2));
          return true;
        }
      }
    } catch (e) {
      console.log(`[Attempt ${i + 1}] Error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 6000));
  }
  console.log('Timed out waiting for production deployment.');
  return false;
}

poll();
