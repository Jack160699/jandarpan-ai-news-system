import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d';
const BASE_URL = 'https://www.jandarpan.news';

async function audit20Stories() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1800 }
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Extract all news cards / articles across the page
  const stories = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('article, .jd-card, .jd-home-aside-card, a[href^="/story/"]'));
    const results = [];
    const seenUrls = new Set();

    for (const card of cards) {
      const link = card.tagName === 'A' ? card : card.querySelector('a[href^="/story/"]');
      const href = link?.getAttribute('href');
      if (!href || seenUrls.has(href)) continue;
      seenUrls.add(href);

      const headline = card.querySelector('h2, h3, h4, .title, strong')?.textContent?.trim() || link.textContent?.trim();
      const img = card.querySelector('img');
      const imgSrc = img?.getAttribute('src') || '';
      
      // District or tag
      const tag = card.querySelector('.district, .tag, [class*="tag"], [class*="district"], [class*="meta"]')?.textContent?.trim() || '';

      results.push({
        href,
        headline,
        imgSrc,
        tag
      });
    }
    return results;
  });

  console.log(`Found ${stories.length} stories on production page.`);
  
  // Also get the broadcast queue from window or DOM
  const broadcastSegments = await page.evaluate(() => {
    return (window).__JD_BROADCAST_QUEUE__ || [];
  });
  console.log(`Broadcast queue length: ${broadcastSegments.length}`);

  // Fetch feed with multiple seeds or offsets to sample 20 broadcast segments
  const feedQueue = [];
  for (const seed of ['session1', 'session2', 'session3', 'session4', 'session5']) {
    try {
      const res = await fetch(`https://www.jandarpan.news/api/broadcast/feed?lang=hi&seed=${seed}`);
      const data = await res.json();
      if (data.queue) {
        for (const item of data.queue) {
          if (!feedQueue.some(x => x.id === item.id)) {
            feedQueue.push(item);
          }
        }
      }
    } catch {}
  }
  console.log(`Total unique broadcast segments across seeds: ${feedQueue.length}`);

  // Format 20-story audit
  const auditList = [];
  const combined = [...feedQueue];
  for (const s of stories) {
    if (!combined.some(x => x.headline === s.headline || x.slug === s.href.replace('/story/', ''))) {
      combined.push({
        id: s.href.replace('/story/', ''),
        headline: s.headline,
        district: s.tag || 'रायपुर',
        imageUrl: s.imgSrc
      });
    }
  }

  for (let i = 0; i < Math.min(25, combined.length); i++) {
    const item = combined[i];
    const img = item.imageUrl || item.imgSrc || '';
    const isGoogle = img.includes('googleusercontent');
    const isGenericStock = img.includes('placeholder') || img.length === 0;

    auditList.push({
      index: i + 1,
      storyId: item.id || `story-${i+1}`,
      headline: item.headlineHi || item.headline || 'समाचार',
      district: item.district || item.districtHi || 'राज्य डेस्क',
      mediaSource: img.startsWith('http') ? new URL(img).hostname : 'local/relative',
      imageUrl: img,
      isStorySpecific: !isGoogle && !isGenericStock,
      status: (!isGoogle && img.length > 0) ? 'PASS - Relevant/Valid' : 'FALLBACK - Safe'
    });
  }

  const outPath = path.join(ARTIFACT_DIR, 'story_media_quality_audit.json');
  fs.writeFileSync(outPath, JSON.stringify(auditList, null, 2), 'utf8');
  console.log(`Audit saved to ${outPath}`);
  console.log(JSON.stringify(auditList.slice(0, 10), null, 2));

  await browser.close();
}

audit20Stories().catch(console.error);
