import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  const page = await context.newPage();

  // Test authuser parameter for stratxcelgame@gmail.com
  const testUrls = [
    "https://analytics.google.com/analytics/web/?authuser=stratxcelgame@gmail.com",
    "https://analytics.google.com/analytics/web/?authuser=1",
    "https://analytics.google.com/analytics/web/?authuser=2",
  ];

  for (const url of testUrls) {
    console.log(`\nNavigating to: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(4000);
    console.log("Landed URL:", page.url());
    console.log("Title:", await page.title());
    const snippet = await page.evaluate(() => document.body.innerText.slice(0, 300).replace(/\n+/g, " "));
    console.log("Snippet:", snippet);
  }

  await page.close();
  browser.close();
}

main().catch(console.error);
