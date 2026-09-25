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
  const res = await fetchPage('https://www.jandarpan.news/story/durg-bhilai-drainage-modernization-municipal-corporation');
  console.log('Status:', res.status, 'Length:', res.data.length);
  const imgMatches = res.data.match(/<img[^>]+src="([^">]+)"/g) || [];
  console.log('Images on story page:', imgMatches.slice(0, 5));
}

main();
