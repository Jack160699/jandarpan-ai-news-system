import { chromium } from "playwright";

async function main() {
  console.log("Connecting to Chrome on CDP http://127.0.0.1:9222 ...");
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const contexts = browser.contexts();
  console.log("Contexts count:", contexts.length);
  const context = contexts[0];
  const pages = context.pages();
  console.log("Pages count:", pages.length);
  for (let i = 0; i < pages.length; i++) {
    console.log(`Page ${i}:`, pages[i].url(), await pages[i].title());
  }

  // Create a new page or use an existing one to check Google Analytics
  const page = await context.newPage();
  console.log("Navigating to https://analytics.google.com ...");
  await page.goto("https://analytics.google.com", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);
  console.log("Current URL:", page.url());
  console.log("Title:", await page.title());

  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
  console.log("Page Snippet:\n", bodyText);
}

main().catch(console.error);
