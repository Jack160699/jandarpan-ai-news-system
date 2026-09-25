import { chromium } from "playwright";

async function inspect() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("https://www.jandarpan.news", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  // Inspect the items in .jdl-mobile-queue__item
  const items = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".jdl-mobile-queue__item"));
    return cards.map((c, i) => {
      const headline = c.querySelector(".jdl-mobile-queue__headline")?.textContent?.trim();
      const img = c.querySelector(".jdl-mobile-queue__thumb");
      const imgSrc = img?.getAttribute("src") || img?.currentSrc;
      return { index: i, headline, cardImg: imgSrc };
    });
  });

  console.log("Found stories in mobile queue:", items.length);
  console.log(JSON.stringify(items, null, 2));

  // Now let's test clicking the first 5 stories and checking what image renders in the TV!
  for (let i = 0; i < Math.min(5, items.length); i++) {
    console.log(`\n--- Clicking Story ${i + 1}: ${items[i].headline?.slice(0, 30)} ---`);
    await page.evaluate((idx) => {
      const cards = document.querySelectorAll(".jdl-mobile-queue__item");
      if (cards[idx]) (cards[idx]).click();
    }, i);

    await page.waitForTimeout(1500);

    const tvInfo = await page.evaluate(() => {
      const tvImg = document.querySelector(".jdl-virtual-screen__img");
      const ambientBg = document.querySelector(".jdl-virtual-screen__ambient-bg");
      const headline = document.querySelector(".jdl-tv__lt-headline")?.textContent?.trim();
      const location = document.querySelector(".jdl-virtual-screen__location-tag")?.textContent?.trim();
      return {
        tvImgSrc: tvImg?.getAttribute("src") || (tvImg)?.currentSrc,
        ambientStyle: ambientBg?.getAttribute("style"),
        tvHeadline: headline?.slice(0, 50),
        tvLocation: location,
      };
    });

    console.log("TV State:", JSON.stringify(tvInfo, null, 2));
    console.log("Card Image vs TV Image Match?:", items[i].cardImg?.includes(tvInfo.tvImgSrc) || tvInfo.tvImgSrc?.includes(items[i].cardImg));
  }

  await browser.close();
}

inspect().catch(console.error);
