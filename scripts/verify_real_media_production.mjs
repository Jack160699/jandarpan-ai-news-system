import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PROD_URL = "https://www.jandarpan.news";
const ARTIFACT_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d";

const BANNED_PATTERNS = [
  /images\.unsplash\.com/i,
  /pexels\.com/i,
  /pixabay\.com/i,
  /shutterstock\.com/i,
  /gettyimages\.com/i,
  /stockphoto/i,
  /midjourney/i,
  /dall-e/i,
  /ai-generated/i,
  /placeholder/i,
  /dummy/i,
  /googleusercontent\.com\/news/i,
  /newsroom/i,
];

function isBannedMedia(url) {
  if (!url) return true;
  return BANNED_PATTERNS.some((rx) => rx.test(url));
}

async function runVerification() {
  console.log("=== JAN DARPAN PRODUCTION REAL MEDIA AUDIT & VERIFICATION ===");
  console.log("Target:", PROD_URL);

  // 1. Fetch Feed API
  console.log("\n--- Step 1: Checking Broadcast Feed API ---");
  const feedRes = await fetch(`${PROD_URL}/api/broadcast/feed`, {
    headers: { "Cache-Control": "no-cache" },
  });
  const feedData = await feedRes.json();
  const queue = feedData.queue || [];
  console.log(`Feed API returned ${queue.length} articles.`);

  const feedAudit = [];
  let prevTimestamp = Infinity;
  let chronologicalOrder = true;
  let anyBannedFound = false;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const img = item.imageUrl || item.heroMedia?.url || "";
    const banned = isBannedMedia(img);
    if (banned) anyBannedFound = true;

    const pubTime = new Date(item.publishedAt || item.published_at || 0).getTime();
    if (pubTime > prevTimestamp) {
      chronologicalOrder = false;
      console.warn(`Chronological inversion at item ${i}: current=${new Date(pubTime).toISOString()}, prev=${new Date(prevTimestamp).toISOString()}`);
    }
    prevTimestamp = pubTime;

    feedAudit.push({
      index: i + 1,
      id: item.id,
      headline: item.titleHindi || item.title || "",
      district: item.district || item.district_name || "Chhattisgarh",
      source: item.sourceAttribution?.publisher || item.source_name || "Unknown",
      publishedAt: item.publishedAt || item.published_at || "",
      imageUrl: img,
      isRealMedia: !banned && img.length > 0,
      bannedPatternMatch: banned,
    });
  }

  console.log(`Feed Audit Summary:`);
  console.log(`- Total Stories in Queue: ${feedAudit.length}`);
  console.log(`- Stories with Real Verified Media: ${feedAudit.filter((f) => f.isRealMedia).length}`);
  console.log(`- Banned/Placeholder Images: ${feedAudit.filter((f) => f.bannedPatternMatch).length}`);
  console.log(`- Chronological Order Verified: ${chronologicalOrder}`);

  // 2. Launch Browser for Live UI Audit
  console.log("\n--- Step 2: Launching Playwright Chromium for Live UI Audit ---");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });

  // Mobile Viewport (390x844)
  console.log("\n--- Step 3: Mobile Viewport Audit (390x844) ---");
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(PROD_URL, { waitUntil: "networkidle", timeout: 45000 });
  await mobilePage.waitForTimeout(3000);

  // Dismiss permission sheet if present
  try {
    const notNow = await mobilePage.$('button:has-text("अभी नहीं"), button:has-text("Later")');
    if (notNow) await notNow.click();
  } catch {}

  const mobileShotLive = path.join(ARTIFACT_DIR, "real_media_mobile_live_tv.png");
  await mobilePage.screenshot({ path: mobileShotLive, fullPage: false });
  console.log("Captured mobile Live TV:", mobileShotLive);

  // Scroll down to Latest News feed on mobile
  await mobilePage.evaluate(() => {
    const feed = document.querySelector(".jdl-mobile-queue") || document.querySelector(".jd-fresh-col") || document.querySelector("section");
    if (feed) feed.scrollIntoView({ behavior: "instant", block: "start" });
    else window.scrollBy(0, 500);
  });
  await mobilePage.waitForTimeout(1000);

  const mobileShotFeed = path.join(ARTIFACT_DIR, "real_media_mobile_latest_feed.png");
  await mobilePage.screenshot({ path: mobileShotFeed, fullPage: false });
  console.log("Captured mobile Latest News feed:", mobileShotFeed);

  // Inspect visible images on mobile
  const mobileImages = await mobilePage.$$eval("img", (imgs) =>
    imgs.map((img) => ({
      src: img.src,
      alt: img.alt,
      width: img.naturalWidth,
      height: img.naturalHeight,
      className: img.className,
    }))
  );
  console.log(`Found ${mobileImages.length} images on mobile page.`);
  const mobileBanned = mobileImages.filter((img) => isBannedMedia(img.src));
  console.log(`Mobile Banned Images: ${mobileBanned.length}`);

  // Desktop Viewport (1280x800)
  console.log("\n--- Step 4: Desktop Viewport Audit (1280x800) ---");
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto(PROD_URL, { waitUntil: "networkidle", timeout: 45000 });
  await desktopPage.waitForTimeout(3000);

  try {
    const notNow = await desktopPage.$('button:has-text("अभी नहीं"), button:has-text("Later")');
    if (notNow) await notNow.click();
  } catch {}

  const desktopShotLive = path.join(ARTIFACT_DIR, "real_media_desktop_live_tv.png");
  await desktopPage.screenshot({ path: desktopShotLive, fullPage: false });
  console.log("Captured desktop Live TV:", desktopShotLive);

  // Scroll down to Latest News feed on desktop
  await desktopPage.evaluate(() => window.scrollBy(0, 600));
  await desktopPage.waitForTimeout(1000);

  const desktopShotFeed = path.join(ARTIFACT_DIR, "real_media_desktop_latest_feed.png");
  await desktopPage.screenshot({ path: desktopShotFeed, fullPage: false });
  console.log("Captured desktop Latest News feed:", desktopShotFeed);

  // Inspect visible images on desktop
  const desktopImages = await desktopPage.$$eval("img", (imgs) =>
    imgs.map((img) => ({
      src: img.src,
      alt: img.alt,
      width: img.naturalWidth,
      height: img.naturalHeight,
      className: img.className,
    }))
  );
  console.log(`Found ${desktopImages.length} images on desktop page.`);
  const desktopBanned = desktopImages.filter((img) => isBannedMedia(img.src));
  console.log(`Desktop Banned Images: ${desktopBanned.length}`);

  // Step 5: Test a Story Detail Page
  console.log("\n--- Step 5: Story Detail Page Audit ---");
  const firstStorySlug = feedAudit[0]?.id ? feedAudit[0].id : null;
  let storyDetailAudit = null;
  if (firstStorySlug) {
    try {
      await desktopPage.goto(`${PROD_URL}/story/${firstStorySlug}`, { waitUntil: "networkidle", timeout: 30000 });
      await desktopPage.waitForTimeout(2000);
      const storyShot = path.join(ARTIFACT_DIR, "real_media_story_detail.png");
      await desktopPage.screenshot({ path: storyShot, fullPage: false });
      console.log("Captured story detail screenshot:", storyShot);

      const storyImg = await desktopPage.$eval("img.hero-image, .story-hero img, article img, img[alt]", (img) => img.src).catch(() => null);
      storyDetailAudit = {
        slug: firstStorySlug,
        displayedImage: storyImg,
        isBanned: isBannedMedia(storyImg),
      };
      console.log("Story detail image:", storyImg, "Banned:", storyDetailAudit.isBanned);
    } catch (e) {
      console.warn("Could not load story detail page:", e.message);
    }
  }

  await browser.close();

  const finalReport = {
    timestamp: new Date().toISOString(),
    prodUrl: PROD_URL,
    totalStoriesInFeed: feedAudit.length,
    realMediaStoriesCount: feedAudit.filter((f) => f.isRealMedia).length,
    bannedMediaCount: feedAudit.filter((f) => f.bannedPatternMatch).length,
    chronologicalOrderVerified: chronologicalOrder,
    mobileBannedCount: mobileBanned.length,
    desktopBannedCount: desktopBanned.length,
    storyDetailAudit,
    feedAudit,
  };

  const reportPath = path.join(ARTIFACT_DIR, "real_source_media_qa_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2), "utf8");
  console.log(`\n=== QA Report written to ${reportPath} ===`);
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
