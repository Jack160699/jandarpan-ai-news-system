const https = require('https');
const fs = require('fs');

function fetch(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}

async function run() {
  const json = await fetch('https://www.jandarpan.news/api/broadcast/feed?lang=hi&_v=' + Date.now());
  const allStories = [...(json.breaking || []), ...(json.queue || [])];

  console.log(`Total broadcast stories on production: ${allStories.length}`);

  const rows = [];
  rows.push('| # | जिला (District) | शीर्षक (Headline) | समय (Published At) | रियल मीडिया URL (Source Media) | अनब्रांडेड / लोगो-मुक्त | वाक्य संख्या (Supporting Sentences) | लाइव स्थिति |');
  rows.push('|---|---|---|---|---|---|---|---|');

  allStories.forEach((s, idx) => {
    const isClean = !s.imageUrl.includes('logo') && !s.imageUrl.includes('watermark') && !s.imageUrl.includes('pti_cg') && !s.imageUrl.includes('shah-mat');
    const sentences = s.script.split('।').filter(x => x.trim().length > 10);
    const supportingCount = Math.max(0, sentences.length - 1);
    const timeStr = new Date(s.publishedAt).toLocaleString('hi-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    const imgShort = s.imageUrl.length > 45 ? '...' + s.imageUrl.slice(-42) : s.imageUrl;

    rows.push(`| ${idx + 1} | ${s.district} | ${s.headline.slice(0, 48)}... | ${timeStr} | [${imgShort}](${s.imageUrl}) | ${isClean ? '✅ स्वच्छ / लोगो-मुक्त' : '❌'} | ${supportingCount} वाक्य | ✅ प्रसारित |`);
  });

  const tableMd = rows.join('\n');
  fs.writeFileSync('scripts/final_qa_table.md', tableMd, 'utf8');
  console.log('Saved final QA table to scripts/final_qa_table.md');
  console.log('\nPreview:\n' + rows.slice(0, 10).join('\n'));
}

run();
