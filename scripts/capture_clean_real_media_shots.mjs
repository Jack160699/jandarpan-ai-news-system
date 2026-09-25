import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const PROD_URL = "https://www.jandarpan.news";
const ARTIFACT_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d";

async function captureCleanShots() {
  console.log("=== CAPTURING SAFE MUTED PRODUCTION SCREENSHOTS ===");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--mute-audio"],
  });

  try {
    // 1. Desktop View (1280x850)
    console.log("Capturing Desktop...");
    const desktopCtx = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    });
    const desktopPage = await desktopCtx.newPage();

    // Ensure audio & speechSynthesis is completely disabled on the page
    await desktopPage.addInitScript(() => {
      window.speechSynthesis?.cancel();
      if (window.speechSynthesis) {
        window.speechSynthesis.speak = () => {};
      }
      HTMLMediaElement.prototype.play = () => Promise.resolve();
    });

    await desktopPage.goto(PROD_URL, { waitUntil: "networkidle", timeout: 45000 });
    await desktopPage.waitForTimeout(2000);

    // Dismiss any dialogs
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const btn = await desktopPage.$('button:has-text("अभी नहीं"), button:has-text("Later"), button:has-text("मैन्युअल रूप से ज़िला चुनें")');
        if (btn) {
          await btn.click();
          await desktopPage.waitForTimeout(500);
        }
      } catch {}
    }

    await desktopPage.evaluate(() => {
      document.querySelectorAll("[role='dialog'], [aria-modal='true']").forEach((el) => el.remove());
      document.querySelectorAll(".fixed.inset-0").forEach((el) => {
        if (el.querySelector("button") || el.textContent.includes("सूचनाएँ") || el.textContent.includes("ज़िले")) {
          el.remove();
        }
      });
    });
    await desktopPage.waitForTimeout(1000);

    const desktopLivePath = path.join(ARTIFACT_DIR, "clean_production_desktop_live_tv.png");
    await desktopPage.screenshot({ path: desktopLivePath, fullPage: false });
    console.log("Saved:", desktopLivePath);

    // Scroll to Latest News feed on Desktop
    await desktopPage.evaluate(() => window.scrollBy(0, 520));
    await desktopPage.waitForTimeout(1500);

    const desktopFeedPath = path.join(ARTIFACT_DIR, "clean_production_desktop_latest_feed.png");
    await desktopPage.screenshot({ path: desktopFeedPath, fullPage: false });
    console.log("Saved:", desktopFeedPath);

    await desktopCtx.close();

    // 2. Mobile View (390x844 iPhone 14)
    console.log("Capturing Mobile...");
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileCtx.newPage();

    await mobilePage.addInitScript(() => {
      window.speechSynthesis?.cancel();
      if (window.speechSynthesis) {
        window.speechSynthesis.speak = () => {};
      }
      HTMLMediaElement.prototype.play = () => Promise.resolve();
    });

    await mobilePage.goto(PROD_URL, { waitUntil: "networkidle", timeout: 45000 });
    await mobilePage.waitForTimeout(2000);

    // Dismiss dialogs
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const btn = await mobilePage.$('button:has-text("अभी नहीं"), button:has-text("Later"), button:has-text("मैन्युअल रूप से ज़िला चुनें")');
        if (btn) {
          await btn.click();
          await mobilePage.waitForTimeout(500);
        }
      } catch {}
    }

    await mobilePage.evaluate(() => {
      document.querySelectorAll("[role='dialog'], [aria-modal='true']").forEach((el) => el.remove());
      document.querySelectorAll(".fixed.inset-0").forEach((el) => {
        if (el.querySelector("button") || el.textContent.includes("सूचनाएँ") || el.textContent.includes("ज़िले")) {
          el.remove();
        }
      });
    });
    await mobilePage.waitForTimeout(1000);

    const mobileLivePath = path.join(ARTIFACT_DIR, "clean_production_mobile_live_tv.png");
    await mobilePage.screenshot({ path: mobileLivePath, fullPage: false });
    console.log("Saved:", mobileLivePath);

    // Scroll to Mobile feed
    await mobilePage.evaluate(() => window.scrollBy(0, 480));
    await mobilePage.waitForTimeout(1200);

    const mobileFeedPath = path.join(ARTIFACT_DIR, "clean_production_mobile_latest_feed.png");
    await mobilePage.screenshot({ path: mobileFeedPath, fullPage: false });
    console.log("Saved:", mobileFeedPath);

    await mobileCtx.close();
    console.log("=== ALL CAPTURES COMPLETED SAFELY ===");
  } finally {
    await browser.close();
    console.log("Browser safely closed, zero processes or audio lingering.");
  }
}

captureCleanShots().catch(err => {
  console.error("Capture error:", err);
  process.exit(1);
});
