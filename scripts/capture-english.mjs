import { chromium } from "@playwright/test";
import path from "node:path";

const OUTPUT_DIR = path.resolve("C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/030cd03b-74e5-4148-9230-61309a430039");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await context.addInitScript(() => {
    try {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
      localStorage.setItem("cgb_perm_notify", "1");
      localStorage.setItem("cgb_perm_location", "1");
      localStorage.setItem("cgb_install_dismissed", "1");
      localStorage.setItem("jdl_audio_unlocked", "1");
    } catch {}
  });

  const page = await context.newPage();
  await page.goto("https://www.jandarpan.news?lang=en", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2500);

  const shot9 = path.join(OUTPUT_DIR, "prod_corr_09_desktop_live_english.png");
  await page.screenshot({ path: shot9, fullPage: false });
  console.log("Saved:", shot9);

  const readBtn = page.locator(".jdl-queue-card__read-btn").first();
  if (await readBtn.isVisible()) {
    await readBtn.click();
    await page.waitForTimeout(1500);
    const shot10 = path.join(OUTPUT_DIR, "prod_corr_10_article_english.png");
    await page.screenshot({ path: shot10, fullPage: false });
    console.log("Saved:", shot10);
  }

  await browser.close();
}

main();
