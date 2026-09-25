import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const resp = await page.goto("https://www.jandarpan.news/story/cg-raipur-3-raipur", { waitUntil: "networkidle" });
  console.log("Status:", resp.status());
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    document.querySelectorAll("[role='dialog'], [aria-modal='true']").forEach((el) => el.remove());
  });
  await page.screenshot({
    path: "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d/clean_production_story_cg_raipur.png",
  });
  await browser.close();
  console.log("Saved story detail screenshot");
}

main().catch(console.error);
