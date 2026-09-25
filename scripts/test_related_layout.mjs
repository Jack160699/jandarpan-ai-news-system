import { chromium } from "@playwright/test";

async function testRelated() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("https://www.jandarpan.news", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);
  const readBtn = page.locator(".jdl-queue-card__read-btn").first();
  await readBtn.click();
  await page.waitForTimeout(1500);

  const relatedSec = page.locator(".jd-reader-related-section");
  const isSecVisible = await relatedSec.isVisible();
  console.log("Related section visible:", isSecVisible);
  if (isSecVisible) {
    const cards = relatedSec.locator(".jdl-queue-card--related");
    const count = await cards.count();
    console.log("Related cards count:", count);
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const headline = await card.locator(".jdl-queue-card__headline").textContent();
      const tag = await card.locator(".jdl-queue-card__tag").textContent();
      const thumb = await card.locator(".jdl-queue-card__thumb-wrap").boundingBox();
      const body = await card.locator(".jdl-queue-card__body").boundingBox();
      const isImageLeft = thumb && body ? thumb.x < body.x : false;
      console.log(`Card ${i}: [${tag?.trim()}] ${headline?.trim()?.slice(0, 35)}... | Thumb Left: ${thumb?.x}, Body Left: ${body?.x} (Is Image Left: ${isImageLeft})`);
    }
  }
  await browser.close();
}

testRelated().catch(console.error);
