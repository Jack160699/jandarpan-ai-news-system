import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const pages = browser.contexts()[0].pages();
  const page = pages.find((p) => p.url().includes("analytics.google.com"));
  if (!page) {
    console.log("No GA page found");
    return;
  }
  await page.screenshot({ path: "ga_debug_step.png" });
  const text = await page.evaluate(() => document.body.innerText);
  console.log("URL:", page.url());
  console.log("Active text snippet:\n", text.slice(0, 800));
  browser.close();
}

main().catch(console.error);
