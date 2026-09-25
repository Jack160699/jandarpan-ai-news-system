import https from 'https';

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
  });
}

async function main() {
  for (const path of ['/', '/home', '/latest', '/district/durg', '/district/raipur', '/profile']) {
    const res = await fetchPage(`https://www.jandarpan.news${path}`);
    const storyMatches = res.data.match(/href="\/story\/[^"]+"/g) || [];
    const adMatches = res.data.match(/durg-solar/g) || [];
    console.log(`=== ${path} === (Status: ${res.status}, Length: ${res.data.length})`);
    console.log(`  Story links found in HTML: ${storyMatches.length}`);
    console.log(`  Ad occurrences in HTML: ${adMatches.length}`);
    if (path === '/district/durg' || path === '/home') {
      const titleMatch = res.data.match(/<title>([^<]+)<\/title>/);
      console.log(`  Page Title: ${titleMatch ? titleMatch[1] : 'none'}`);
    }
  }
}

main();
