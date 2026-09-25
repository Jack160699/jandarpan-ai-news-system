import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PROD_URL = "https://www.jandarpan.news";
const ARTIFACT_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d";

async function verifyFeedCorrection() {
  console.log("=== JAN DARPAN PRODUCTION FEED CORRECTION VERIFICATION ===");
  console.log("Target:", PROD_URL);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--autoplay-policy=no-user-gesture-required"]
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
  });

  const page = await context.newPage();

  console.log("Navigating to production...");
  await page.goto(PROD_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3500);

  // Dismiss permission sheet if present
  try {
    const notNow = await page.$('button:has-text("अभी नहीं"), button:has-text("Later")');
    if (notNow) {
      await notNow.click();
      await page.waitForTimeout(600);
    }
  } catch {}

  // 1. Check TV Location Tag Position
  console.log("\n1. Verifying TV Location Tag...");
  const locTag = await page.$(".jdl-virtual-screen__location-tag");
  let locTagDetails = null;
  if (locTag) {
    locTagDetails = await page.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const parentRect = el.parentElement.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        text: el.innerText.trim(),
        left: rect.left - parentRect.left,
        top: rect.top - parentRect.top,
        computedTop: style.top,
        computedLeft: style.left,
        computedRight: style.right,
      };
    }, locTag);
    console.log("Location Tag details:", JSON.stringify(locTagDetails, null, 2));
  } else {
    console.log("Location tag not found!");
  }

  // 2. Check for duplicate location tags
  const totalLocTags = await page.$$eval(".jdl-virtual-screen__location-tag, .jdl-newsscreen__location", (els) => els.length);
  console.log("Total TV location tags count:", totalLocTags);

  // 3. Check Reading Strip (Teleprompter)
  console.log("\n2. Verifying Reading Strip (Teleprompter)...");
  const readingStrip = await page.$(".jdl-tv__lt-headline");
  let stripDetails = null;
  if (readingStrip) {
    stripDetails = await page.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        text: el.innerText.trim(),
        textLength: el.innerText.trim().length,
        animationName: style.animationName,
        animationDuration: style.animationDuration,
        animationTimingFunction: style.animationTimingFunction,
      };
    }, readingStrip);
    console.log("Reading strip details:", JSON.stringify(stripDetails, null, 2));
  }

  // 4. Check "Latest News" section & multiple stories
  console.log("\n3. Verifying Latest News section & stories...");
  const queueItems = await page.$$(".jdl-mobile-queue__item");
  console.log(`Found ${queueItems.length} stories in Latest News feed`);

  // Inspect the first 5 stories for uniform design
  const storyCardsInfo = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".jdl-mobile-queue__item"));
    return items.slice(0, 10).map((it, idx) => {
      const thumb = it.querySelector(".jdl-mobile-queue__thumb, .jdl-mobile-queue__thumb-ph");
      const headline = it.querySelector(".jdl-mobile-queue__headline")?.textContent?.trim();
      const tag = it.querySelector(".jdl-mobile-queue__tag")?.textContent?.trim();
      const time = it.querySelector(".jdl-mobile-queue__time")?.textContent?.trim();
      const rect = it.getBoundingClientRect();
      return {
        index: idx + 1,
        headline,
        tag,
        time,
        hasThumb: !!thumb,
        cardHeight: Math.round(rect.height),
      };
    });
  });
  console.log("Story cards sampled:", JSON.stringify(storyCardsInfo, null, 2));

  // 5. Check if "Latest Updates" or .jd-home-broadcast-aside exists or is visible
  console.log("\n4. Checking for unwanted 'Latest Updates' / alternate layout...");
  const latestUpdatesTextCount = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const matches = bodyText.match(/Latest Updates/gi);
    return matches ? matches.length : 0;
  });
  console.log("Occurrences of 'Latest Updates' text:", latestUpdatesTextCount);

  const asideVisible = await page.evaluate(() => {
    const aside = document.querySelector(".jd-home-broadcast-aside");
    if (!aside) return false;
    const style = window.getComputedStyle(aside);
    return style.display !== "none" && style.visibility !== "hidden";
  });
  console.log("Is .jd-home-broadcast-aside visible on mobile?:", asideVisible);

  // Take top screenshot
  const shotTop = path.join(ARTIFACT_DIR, "live_feed_mobile_top.png");
  await page.screenshot({ path: shotTop, fullPage: false });
  console.log("Saved top screenshot:", shotTop);

  // Scroll down to show continuous Latest News feed
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(500);
  const shotFeedMid = path.join(ARTIFACT_DIR, "live_feed_mobile_mid.png");
  await page.screenshot({ path: shotFeedMid, fullPage: false });
  console.log("Saved feed mid screenshot:", shotFeedMid);

  // Scroll down further
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(500);
  const shotFeedBottom = path.join(ARTIFACT_DIR, "live_feed_mobile_bottom.png");
  await page.screenshot({ path: shotFeedBottom, fullPage: false });
  console.log("Saved feed bottom screenshot:", shotFeedBottom);

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    locTagDetails,
    totalLocTags,
    stripDetails,
    storyCount: queueItems.length,
    storyCardsInfo,
    latestUpdatesTextCount,
    asideVisible,
  };
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live_feed_verification_report.json"), JSON.stringify(report, null, 2));

  await browser.close();
  console.log("=== VERIFICATION COMPLETE ===");
}

verifyFeedCorrection().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
