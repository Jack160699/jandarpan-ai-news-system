import { chromium } from "playwright";
import path from "path";

const ARTIFACTS_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/50e7bc10-7e9a-4ba6-af91-1935a0e83997";
const executablePath = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1228\\chrome-headless-shell-win64\\chrome-headless-shell.exe";

async function run() {
  const browser = await chromium.launch({ executablePath, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto("https://www.jandarpan.news/", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });

  // Scroll to 2200px
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "clean-01c-home-sections-mid.png") });

  // Scroll to 3400px
  await page.evaluate(() => window.scrollTo(0, 3200));
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "clean-01d-home-sections-lower.png") });

  await browser.close();
  console.log("Section scroll captures complete!");
}

run().catch(console.error);
