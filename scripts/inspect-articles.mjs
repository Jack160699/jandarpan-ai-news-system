import fs from 'fs';

async function main() {
  const res = await fetch('https://www.jandarpan.news');
  const html = await res.text();
  console.log('HTML size:', html.length);
  
  // Look for initialBroadcastQueue or articles
  const scriptRegex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
  let matches;
  let allF = [];
  while ((matches = scriptRegex.exec(html)) !== null) {
    allF.push(matches[1]);
  }
  console.log('Next f chunks found:', allF.length);

  // Let's also check with Playwright directly on page evaluate
}

main().catch(console.error);
