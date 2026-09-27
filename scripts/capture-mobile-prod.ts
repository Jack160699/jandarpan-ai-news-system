import { chromium } from 'playwright';

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  
  const viewports = [
    { name: '360', width: 360, height: 740 },
    { name: '390', width: 390, height: 844 },
    { name: '430', width: 430, height: 932 },
  ];

  for (const vp of viewports) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    });

    await ctx.addCookies([
      { name: 'nr-e2e-user', value: 'e2e_verified_reader_99', domain: '.jandarpan.news', path: '/' },
      { name: 'nr-e2e-user', value: 'e2e_verified_reader_99', domain: 'www.jandarpan.news', path: '/' },
    ]);

    const page = await ctx.newPage();
    console.log(`Navigating at viewport ${vp.name}px...`);
    await page.goto('https://www.jandarpan.news', { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Wait for queue card to render
    try {
      await page.waitForSelector('.jdl-card-engagement-row', { timeout: 10000 });
    } catch {
      console.warn(`Timeout waiting for .jdl-card-engagement-row at ${vp.name}px`);
    }

    await page.waitForTimeout(2000);
    const filename = `before_mobile_${vp.name}.png`;
    await page.screenshot({ path: filename });
    console.log(`Saved screenshot ${filename}`);
    await ctx.close();
  }

  await browser.close();
}

capture().catch(console.error);
