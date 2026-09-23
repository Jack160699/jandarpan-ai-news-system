import { chromium } from "playwright";
import path from "path";

const ARTIFACTS_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/50e7bc10-7e9a-4ba6-af91-1935a0e83997";
const executablePath = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1228\\chrome-headless-shell-win64\\chrome-headless-shell.exe";

async function run() {
  const browser = await chromium.launch({ executablePath, headless: true });

  // 1. Desktop 1440px - Header & Live Ticker
  console.log("Capturing Desktop 1440px...");
  const ctxDesk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctxDesk.addInitScript(() => {
    try {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    } catch {}
  });
  const pDesk = await ctxDesk.newPage();
  await pDesk.goto("https://www.jandarpan.news/", { waitUntil: "networkidle" });
  await pDesk.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach(d => d.remove());
  });
  await pDesk.waitForTimeout(500);

  // Desktop Header + Live Ticker screenshot
  await pDesk.screenshot({
    path: path.join(ARTIFACTS_DIR, "overhaul-01-desktop-header-ticker.png"),
    clip: { x: 0, y: 0, width: 1440, height: 600 }
  });

  // Desktop Full Above the Fold
  await pDesk.screenshot({
    path: path.join(ARTIFACTS_DIR, "overhaul-01b-desktop-hero.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 }
  });

  // 2. Desktop District Modal Open
  console.log("Capturing Desktop District Selector Dialog...");
  const selectorBtn = await pDesk.$("[data-testid='district-selector-trigger']");
  if (selectorBtn) {
    await selectorBtn.click();
    await pDesk.waitForTimeout(400);
    await pDesk.screenshot({
      path: path.join(ARTIFACTS_DIR, "overhaul-02-desktop-district-modal.png"),
      clip: { x: 0, y: 0, width: 1440, height: 800 }
    });
  }
  await ctxDesk.close();

  // 3. Mobile 375px - Masthead, Brand Lockup, Ticker, and Story Cards (Left Image, Right Headline)
  console.log("Capturing Mobile 375px...");
  const ctxMobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  });
  await ctxMobile.addInitScript(() => {
    try {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    } catch {}
  });
  const pMobile = await ctxMobile.newPage();
  await pMobile.goto("https://www.jandarpan.news/", { waitUntil: "networkidle" });
  await pMobile.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach(d => d.remove());
  });
  await pMobile.waitForTimeout(500);

  // Mobile Top (Masthead with Brand Lockup + Live Ticker + Hero)
  await pMobile.screenshot({
    path: path.join(ARTIFACTS_DIR, "overhaul-03-mobile-masthead-ticker.png"),
    clip: { x: 0, y: 0, width: 375, height: 750 }
  });

  // Scroll down on mobile to view Story Cards (verifying Image Left, Headline Right + prominent tags)
  await pMobile.evaluate(() => {
    window.scrollBy(0, 550);
  });
  await pMobile.waitForTimeout(400);
  await pMobile.screenshot({
    path: path.join(ARTIFACTS_DIR, "overhaul-04-mobile-story-cards.png"),
    clip: { x: 0, y: 0, width: 375, height: 750 }
  });

  // Mobile District Modal
  console.log("Capturing Mobile District Selector...");
  await pMobile.evaluate(() => window.scrollTo(0, 0));
  await pMobile.waitForTimeout(300);
  const mobSelectorBtn = await pMobile.$("[data-testid='district-selector-trigger']");
  if (mobSelectorBtn) {
    await mobSelectorBtn.click();
    await pMobile.waitForTimeout(400);
    await pMobile.screenshot({
      path: path.join(ARTIFACTS_DIR, "overhaul-05-mobile-district-modal.png"),
      clip: { x: 0, y: 0, width: 375, height: 812 }
    });
  }

  await ctxMobile.close();
  await browser.close();
  console.log("All overhaul verification screenshots captured successfully!");
}

run().catch(console.error);
