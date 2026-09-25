import { chromium } from 'playwright';

async function snap() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  await page.goto('https://www.jandarpan.news', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Remove any overlay dialogs for clean view
  await page.evaluate(() => {
    document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="dialog"], [class*="prompt"]').forEach(el => {
      if (el.tagName !== 'HEADER' && !el.classList.contains('jdl-tv')) {
        el.remove();
      }
    });
    // Remove backdrops
    document.querySelectorAll('[class*="backdrop"], [class*="overlay"]').forEach(el => {
      if (!el.classList.contains('jdl-virtual-screen__overlay')) {
        el.remove();
      }
    });
  });
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d/live_tv_mobile_clean_final.png' });
  await browser.close();
  console.log('Mobile clean final screenshot captured!');
}

snap().catch(console.error);
