import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto("https://www.jandarpan.news/latest", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    document.querySelectorAll("[role='dialog'], [aria-modal='true']").forEach((el) => el.remove());
  });
  await page.screenshot({
    path: "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d/clean_production_desktop_latest_page.png",
  });
  await browser.close();
  console.log("Saved desktop latest page");
}

main().catch(console.error);
