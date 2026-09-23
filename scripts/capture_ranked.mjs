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

  // Scroll to 4800px
  await page.evaluate(() => window.scrollTo(0, 4800));
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "clean-01e-home-sections-trending-ranked.png") });

  await browser.close();
  console.log("Trending ranked capture complete!");
}

run().catch(console.error);
