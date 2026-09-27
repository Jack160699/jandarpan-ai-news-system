import { chromium } from "playwright";

async function testCardClick() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("https://www.jandarpan.news/", { waitUntil: "networkidle" });
  
  const cards = await page.locator("article.jdl-queue-card").all();
  console.log("Total cards rendered:", cards.length);
  for (let i = 0; i < Math.min(5, cards.length); i++) {
    const head = await cards[i].locator(".jdl-queue-card__headline").textContent();
    const tag = await cards[i].locator(".jdl-queue-card__tag").textContent();
    console.log(`Card #${i}: [${tag.trim()}] ${head.trim().slice(0, 50)}`);
  }

  // Initial TV state
  const initialTv = (await page.locator(".jdl-tv__lt-headline").first().textContent() || "").trim();
  console.log("\nInitial TV Script:", initialTv.slice(0, 60));

  // Click card #2 (index 2) headline
  const card2Head = (await cards[2].locator(".jdl-queue-card__headline").textContent() || "").trim();
  console.log(`\nClicking Card #2 headline: "${card2Head.slice(0, 45)}"`);
  await cards[2].locator(".jdl-queue-card__headline").click();
  await page.waitForTimeout(1500);

  const tvScriptAfterCard2 = (await page.locator(".jdl-tv__lt-headline").first().textContent() || "").trim();
  console.log("TV script after clicking Card #2:", tvScriptAfterCard2.slice(0, 70));

  // Click card #2 read button
  console.log("\nClicking Card #2 Read button...");
  await cards[2].locator("button.jdl-queue-card__read-btn").click();
  await page.waitForTimeout(2000);
  const readerHead = (await page.locator("h1.jd-reader-headline").textContent() || "").trim();
  console.log("Reader headline:", readerHead.slice(0, 70));

  console.log("\nMatches:");
  console.log("TV updated to Card #2?", tvScriptAfterCard2.toLowerCase().includes(card2Head.toLowerCase().slice(0, 20)) || card2Head.toLowerCase().includes(tvScriptAfterCard2.toLowerCase().slice(0, 20)));
  console.log("Reader matches Card #2?", readerHead.toLowerCase().includes(card2Head.toLowerCase().slice(0, 20)) || card2Head.toLowerCase().includes(readerHead.toLowerCase().slice(0, 20)));

  await browser.close();
}

testCardClick().catch(console.error);
