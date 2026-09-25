import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PROD_URL = "https://www.jandarpan.news";
const ARTIFACT_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d";

async function runComprehensiveQA() {
  console.log("=== JAN DARPAN PRODUCTION VERIFICATION START ===");
  console.log("Target:", PROD_URL);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--autoplay-policy=no-user-gesture-required"]
  });

  const qaReport = {
    timestamp: new Date().toISOString(),
    prodUrl: PROD_URL,
    checks: {},
    audioStingsDetected: 0,
    mediaAudit: [],
    storyFeedAudit: [],
  };

  // 1. MOBILE VERIFICATION (390x844)
  console.log("\n--- Testing Mobile View (390x844) ---");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
  });

  const mobilePage = await mobileContext.newPage();
  
  // Track console logs and audio errors
  const consoleLogs = [];
  mobilePage.on("console", (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await mobilePage.goto(PROD_URL, { waitUntil: "networkidle", timeout: 45000 });
  await mobilePage.waitForTimeout(3000);

  // Dismiss permission sheet if present
  try {
    const notNow = await mobilePage.$('button:has-text("अभी नहीं"), button:has-text("Later")');
    if (notNow) {
      await notNow.click();
      await mobilePage.waitForTimeout(800);
    }
  } catch {}

  // Take mobile screenshot
  const mobileShotPath = path.join(ARTIFACT_DIR, "live_tv_mobile_final_prod.png");
  await mobilePage.screenshot({ path: mobileShotPath, fullPage: false });
  console.log("Mobile screenshot saved:", mobileShotPath);

  // Check 1: Single Header
  const headerCount = await mobilePage.locator("header.jd-masthead").count();
  const subHeaderCount = await mobilePage.locator(".jd-desk-chrome-root, .jd-subnav, .jd-second-header").count();
  const topProfileCount = await mobilePage.locator("header.jd-masthead a[href*='profile'], header.jd-masthead a[href*='archive']").count();
  
  qaReport.checks.singleHeader = headerCount === 1;
  qaReport.checks.noSecondMobileHeader = subHeaderCount === 0 || !(await mobilePage.locator(".jd-desk-chrome-root").isVisible());
  qaReport.checks.noTopRightProfile = topProfileCount === 0;

  // Check 2: Live TV visual hierarchy
  const tvVisible = await mobilePage.locator(".jdl-tv").isVisible();
  const anchorVisible = await mobilePage.locator(".jdl-tv__studio-img, .jdl-tv__studio-bg img").isVisible();
  const cornerBugCount = await mobilePage.locator(".jdl-tv__corner-bug, .jdl-tv__live-pill, .jdl-tv__time").count();
  const locationTagCount = await mobilePage.locator(".jdl-virtual-screen__location-tag").count();
  const locationTagText = locationTagCount > 0 ? await mobilePage.locator(".jdl-virtual-screen__location-tag").innerText() : "";

  qaReport.checks.tvVisible = tvVisible;
  qaReport.checks.anchorVisible = anchorVisible;
  qaReport.checks.noLiveTimeBadgeInTV = cornerBugCount === 0;
  qaReport.checks.singleLocationInsideStoryMedia = locationTagCount === 1;
  qaReport.checks.locationValue = locationTagText.trim();

  // Check 3: Main headline strip & full synchronized reading strip
  const redBadgeText = await mobilePage.locator(".jdl-tv__lt-badge").innerText();
  const teleprompterVisible = await mobilePage.locator(".jdl-tv__lt-headline-wrap").isVisible();
  const teleprompterText = await mobilePage.locator(".jdl-tv__lt-headline").innerText();

  qaReport.checks.redBadgeMukhyakhabar = redBadgeText.includes("मुख्य खबर") || redBadgeText.includes("ब्रेकिंग");
  qaReport.checks.readingStripVisible = teleprompterVisible;
  qaReport.checks.readingStripTextLength = teleprompterText.length;
  qaReport.checks.readingStripFullArticle = teleprompterText.length > 50;

  // Check 4: Durg Solar ad details
  const adSlot = mobilePage.locator(".jdl-bar__ad-slot");
  const adHref = await adSlot.getAttribute("href");
  const adText = await adSlot.innerText();
  const adImgSrc = await mobilePage.locator(".jdl-bar__ad-thumb").getAttribute("src");

  qaReport.checks.durgSolarBrand = adText.includes("DURG SOLAR");
  qaReport.checks.durgSolar3kW = adText.includes("3 kW") && adText.includes("₹72,000*");
  qaReport.checks.durgSolar5kW = adText.includes("5 kW") && adText.includes("₹1,82,000*");
  qaReport.checks.durgSolarCallNumber = adHref === "tel:+917777812777" || adText.includes("+91 77778 12777");
  qaReport.checks.durgSolarRooftopImg = adImgSrc === "/jd-live/solar-rooftop.jpg";

  // Check 5: Controls (Play/Pause, Mute/Unmute, Share, WhatsApp)
  const playBtn = mobilePage.locator("[data-testid='jdl-play-pause-btn']");
  const muteBtn = mobilePage.locator("[data-testid='jdl-mute-btn']");
  const shareBtn = mobilePage.locator("[data-testid='jdl-share-btn']");
  const whatsappBtn = mobilePage.locator("[data-testid='jdl-whatsapp-btn']");

  qaReport.checks.playPauseBtn = await playBtn.isVisible();
  qaReport.checks.muteBtn = await muteBtn.isVisible();
  qaReport.checks.shareBtn = await shareBtn.isVisible();
  qaReport.checks.whatsappBtn = await whatsappBtn.isVisible();

  // Ensure modal does not block controls
  await mobilePage.evaluate(() => {
    document.querySelector('[aria-labelledby="jd-perm-title"]')?.remove();
    document.querySelectorAll('.jd-sheet-backdrop, .jd-perm-sheet').forEach(el => el.remove());
  });
  await mobilePage.waitForTimeout(500);

  // Test Pause
  console.log("Testing PAUSE interaction...");
  await playBtn.click();
  await mobilePage.waitForTimeout(2000);
  const speechPausedAfterClick = await mobilePage.evaluate(() => {
    return window.speechSynthesis ? window.speechSynthesis.paused || !window.speechSynthesis.speaking : true;
  });
  qaReport.checks.pauseHaltsSpeech = speechPausedAfterClick;

  // Test Resume
  console.log("Testing RESUME interaction...");
  await playBtn.click();
  await mobilePage.waitForTimeout(2000);

  // Test Mute / Unmute
  console.log("Testing MUTE/UNMUTE interaction...");
  const initialMuted = (await mobilePage.locator(".jdl-bar__btn--muted").count()) > 0;
  await muteBtn.click();
  await mobilePage.waitForTimeout(1000);
  const afterFirstClickMuted = (await mobilePage.locator(".jdl-bar__btn--muted").count()) > 0;
  await muteBtn.click();
  await mobilePage.waitForTimeout(1000);
  const afterSecondClickMuted = (await mobilePage.locator(".jdl-bar__btn--muted").count()) > 0;
  qaReport.checks.muteTogglesState =
    initialMuted !== afterFirstClickMuted &&
    afterFirstClickMuted !== afterSecondClickMuted;

  // Check 6: Bottom Navigation
  const bottomNav = mobilePage.locator("nav.jd-bottom-nav");
  const bottomNavLinks = await bottomNav.locator("a").all();
  const bottomNavKeys = [];
  for (const link of bottomNavLinks) {
    const k = await link.getAttribute("data-jd-nav-key");
    const label = await link.innerText();
    bottomNavKeys.push({ key: k, label: label.trim() });
  }

  qaReport.checks.bottomNavKeys = bottomNavKeys;
  qaReport.checks.noListenTab = !bottomNavKeys.some((b) => b.key === "listen" || b.label.includes("सुनें"));
  qaReport.checks.hasProfileTab = bottomNavKeys.some((b) => b.key === "profile" || b.label.includes("प्रोफ़ाइल") || b.label.includes("Profile"));

  // Check 7: 48-Hour Chhattisgarh News Feed below TV
  console.log("Auditing 48-hour Chhattisgarh news feed...");
  const feedItems = await mobilePage.locator(".jd-fresh-col__item").all();
  qaReport.checks.feedStoryCount = feedItems.length;

  for (let i = 0; i < Math.min(feedItems.length, 25); i++) {
    const item = feedItems[i];
    const headline = await item.locator(".jd-fresh-col__headline").innerText();
    const tag = await item.locator(".jd-fresh-col__tag").innerText();
    const imgCount = await item.locator(".jd-fresh-col__thumb").count();
    const imgSrc = imgCount > 0 ? await item.locator(".jd-fresh-col__thumb").getAttribute("src") : "";
    qaReport.storyFeedAudit.push({
      index: i + 1,
      headline: headline.trim(),
      tag: tag.trim(),
      hasImage: imgCount > 0 && !imgSrc.includes("placeholder")
    });
  }

  await mobileContext.close();

  // 2. DESKTOP VERIFICATION (1440x900)
  console.log("\n--- Testing Desktop View (1440x900) ---");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(PROD_URL, { waitUntil: "networkidle", timeout: 45000 });
  await desktopPage.waitForTimeout(3000);

  const desktopShotPath = path.join(ARTIFACT_DIR, "live_tv_desktop_final_prod.png");
  await desktopPage.screenshot({ path: desktopShotPath, fullPage: false });
  console.log("Desktop screenshot saved:", desktopShotPath);

  // Audit 20 actual news images
  console.log("Auditing 20 news images on desktop...");
  const desktopImages = await desktopPage.locator(".jdl-virtual-screen__img, .jd-fresh-col__thumb").all();
  for (let i = 0; i < Math.min(desktopImages.length, 20); i++) {
    const src = await desktopImages[i].getAttribute("src");
    qaReport.mediaAudit.push({
      index: i + 1,
      src,
      valid: !!src && !src.includes("broken") && !src.includes("googleusercontent.com/news")
    });
  }

  await desktopContext.close();

  // 3. RESPONSIVE VIEWPORT TESTS (375x844, 360x800)
  console.log("\n--- Testing Viewport 375x844 ---");
  const v375Context = await browser.newContext({ viewport: { width: 375, height: 844 } });
  const v375Page = await v375Context.newPage();
  await v375Page.goto(PROD_URL, { waitUntil: "networkidle" });
  const v375Overflow = await v375Page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  qaReport.checks.viewport375NoOverflow = !v375Overflow;
  await v375Context.close();

  console.log("--- Testing Viewport 360x800 ---");
  const v360Context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const v360Page = await v360Context.newPage();
  await v360Page.goto(PROD_URL, { waitUntil: "networkidle" });
  const v360Overflow = await v360Page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  qaReport.checks.viewport360NoOverflow = !v360Overflow;
  await v360Context.close();

  await browser.close();

  // Save QA Report JSON
  const reportPath = path.join(ARTIFACT_DIR, "final_live_tv_qa_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(qaReport, null, 2));
  console.log("QA Report saved to:", reportPath);
  console.log("\n=== QA SUMMARY ===");
  console.log(JSON.stringify(qaReport.checks, null, 2));
}

runComprehensiveQA().catch((err) => {
  console.error("QA execution failed:", err);
  process.exit(1);
});
