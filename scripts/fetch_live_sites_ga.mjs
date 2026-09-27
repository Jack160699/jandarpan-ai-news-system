async function checkSite(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const gMatches = html.match(/G-[A-Z0-9]{8,12}/g) || [];
    const gtagMatches = html.match(/gtag\(['"]config['"],\s*['"]([^'"]+)['"]/g) || [];
    console.log(`\nURL: ${url}`);
    console.log(`G- Tags:`, Array.from(new Set(gMatches)));
    console.log(`gtag configs:`, Array.from(new Set(gtagMatches)));
  } catch (e) {
    console.log(`Error fetching ${url}:`, e.message);
  }
}

async function main() {
  await checkSite("https://durgsolar.com");
  await checkSite("https://www.stratxcel.in");
  await checkSite("https://www.jandarpan.news");
  await checkSite("https://jandarpan.news");
}

main();
