import https from 'https';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });
}

async function checkDeployment() {
  console.log('Checking for production deployment...');
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      const res = await fetchUrl(`https://www.jandarpan.news/profile?_t=${Date.now()}`);
      console.log(`[Attempt ${attempt}] Status: ${res.status}`);
      if (res.status === 200 && (res.data.includes('Jan Darpan Newsroom') || res.data.includes('Editorial & Verification Policy') || res.data.includes('जन दर्पण न्यूज़रूम'))) {
        console.log('SUCCESS: New deployment is LIVE on production!');
        return true;
      }
      // Also check home page
      const homeRes = await fetchUrl(`https://www.jandarpan.news/home?_t=${Date.now()}`);
      if (homeRes.status === 200 && homeRes.data.includes('nav.profile')) {
        console.log('SUCCESS: New deployment is LIVE on production!');
        return true;
      }
    } catch (err) {
      console.log(`[Attempt ${attempt}] Error:`, err.message);
    }
    await new Promise(r => setTimeout(r, 6000));
  }
  console.log('Deployment check timeout.');
  return false;
}

checkDeployment();
