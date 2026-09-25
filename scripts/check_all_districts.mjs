import https from 'https';

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
  });
}

async function main() {
  const districts = ['bilaspur', 'bastar', 'korba', 'rajnandgaon', 'mahasamund', 'balod', 'durg', 'raipur'];
  for (const d of districts) {
    const text = await fetchPage(`https://www.jandarpan.news/district/${d}`);
    const storyMatches = text.match(/href="\/story\/[^"]+"/g) || [];
    console.log(`District ${d}: ${storyMatches.length} stories found on page`);
  }
}

main();
