import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  console.log("Navigating to https://www.jandarpan.news ...");
  await page.goto("https://www.jandarpan.news", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const ads = await page.$$("div[aria-label*='दुर्ग सोलर विज्ञापन']");
  console.log("Found ad elements with aria-label:", ads.length);

  if (ads.length > 0) {
    console.log("Clicking first ad with force: true...");
    await ads[0].click({ force: true });
    await page.waitForTimeout(2000);

    const ltBadge = await page.evaluate(() => document.querySelector(".jdl-tv__lt-badge")?.textContent);
    const isAd = await page.evaluate(() => document.querySelector(".jdl-tv__lt-badge--ad") !== null);
    const headline = await page.evaluate(() => document.querySelector(".jdl-tv__lt-headline")?.textContent);
    console.log("After real click: ltBadge =", ltBadge?.trim(), "isAd =", isAd);
    console.log("TV Headline Snippet:", headline?.trim()?.slice(0, 70));
    await page.screenshot({ path: "scripts/prod_tv_ad_real_click.png" });
  }

  await browser.close();
}

main().catch(console.error);
