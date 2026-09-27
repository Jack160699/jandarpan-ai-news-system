import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  const page = await context.newPage();

  console.log("Checking Google Analytics with shriyanshchandrakar@gmail.com...");
  await page.goto("https://analytics.google.com/analytics/web/?authuser=shriyanshchandrakar@gmail.com", {
    waitUntil: "domcontentloaded",
    timeout: 30000
  });
  await page.waitForTimeout(6000);

  console.log("Landed URL:", page.url());
  console.log("Title:", await page.title());
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 3000));
  console.log("Snippet:\n", bodyText.replace(/\n+/g, " "));

  await page.close();
  browser.close();
}

main().catch(console.error);
