import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  await page.goto('https://www.jandarpan.news', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Click any modal dismiss
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const dismiss = buttons.find(b => 
      b.textContent.includes('मैन्युअल') || 
      b.textContent.includes('अभी नहीं') || 
      b.textContent.includes('बंद')
    );
    if (dismiss) dismiss.click();
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d/live_tv_mobile_unobscured.png' });
  await browser.close();
  console.log('Mobile unobscured screenshot saved!');
}

main().catch(console.error);
