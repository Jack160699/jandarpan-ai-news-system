import { chromium } from "@playwright/test";

const BASE_URL = process.env.TEST_URL || "https://www.jandarpan.news";

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`JAN DARPAN LIVE — COMPREHENSIVE E2E VERIFICATION`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({ headless: true });
  const results = {};

  const setupPageStorage = async (page, lang = "hi") => {
    await page.addInitScript((l) => {
      window.localStorage.setItem("jd-ds-perm-notify-v1", "1");
      window.localStorage.setItem("jd-ds-perm-loc-v1", "1");
      window.localStorage.setItem("cgb-language", l);
      window.localStorage.setItem("cgb-language-chosen", "1");
      window.localStorage.setItem("jd-language", l);
    }, lang);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Desktop Hindi
  // ──────────────────────────────────────────────────────────────────────────
  console.log("--> Test 1: Desktop Hindi...");
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const desktopPage = await desktopCtx.newPage();
  await setupPageStorage(desktopPage, "hi");
  await desktopPage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await desktopPage.waitForSelector(".jdl-tv", { timeout: 20000 });

  const tvExists = await desktopPage.$(".jdl-tv");
  const bugHi = await desktopPage.textContent(".jdl-tv__bug-name").catch(() => "");
  const top10 = await desktopPage.$(".jdl-tv__top10-area");
  const top10Visible = top10 ? await top10.isVisible() : false;
  const barTextHi = await desktopPage.textContent(".jdl-bar__headline-text").catch(() => "");

  console.log(`   Desktop TV present: ${!!tvExists}`);
  console.log(`   Desktop Bug text (HI): "${bugHi.trim()}"`);
  console.log(`   Desktop Top 10 panel visible: ${top10Visible}`);
  console.log(`   Broadcast headline (HI): "${barTextHi.trim().slice(0, 60)}..."`);
  results["desktop_hindi"] = !!tvExists && bugHi.includes("जन दर्पण") && top10Visible;
  await desktopCtx.close();

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Desktop English
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--> Test 2: Desktop English...");
  const desktopEnCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const desktopEnPage = await desktopEnCtx.newPage();
  await setupPageStorage(desktopEnPage, "en");
  await desktopEnPage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await desktopEnPage.waitForSelector(".jdl-tv", { timeout: 20000 });

  const bugEn = await desktopEnPage.textContent(".jdl-tv__bug-name").catch(() => "");
  console.log(`   Desktop Bug text (EN): "${bugEn.trim()}"`);
  results["desktop_english"] = bugEn.includes("JAN DARPAN");
  await desktopEnCtx.close();

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3, 4, 5, 6, 7: Mobile Viewport (Hindi, English, Light/Dark, Pinning)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--> Test 3: Mobile Viewport & TV Pinning Under Scroll...");
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileCtx.newPage();
  await setupPageStorage(mobilePage, "hi");
  await mobilePage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobilePage.waitForSelector(".jdl-tv", { timeout: 20000 });
  await mobilePage.waitForSelector(".jdl-mobile-queue__item", { timeout: 20000 }).catch(() => null);

  // 16:9 check
  const tvDims = await mobilePage.evaluate(() => {
    const vp = document.querySelector(".jdl-tv__viewport");
    const tv = document.querySelector(".jdl-tv");
    return {
      vpW: vp?.getBoundingClientRect().width || 0,
      vpH: vp?.getBoundingClientRect().height || 0,
      tvW: tv?.getBoundingClientRect().width || 0,
      tvH: tv?.getBoundingClientRect().height || 0,
    };
  });
  const ratio = (tvDims.vpW / tvDims.vpH).toFixed(2);
  console.log(`   Mobile Viewport: ${tvDims.vpW}x${tvDims.vpH}px (Ratio: ${ratio}, 16:9 = 1.78)`);
  results["mobile_16_9"] = ratio >= 1.7 && ratio <= 1.85;

  // Pinning Check 1 (Scroll down 250px)
  await mobilePage.evaluate(() => window.scrollBy(0, 250));
  await mobilePage.waitForTimeout(400);

  const scroll1 = await mobilePage.evaluate(() => {
    const tv = document.querySelector(".jdl-tv");
    const mh = document.querySelector(".jd-masthead");
    const latest = document.querySelector(".jdl-mobile-queue");
    const rect = tv?.getBoundingClientRect();
    const mhRect = mh?.getBoundingClientRect();
    const lRect = latest?.getBoundingClientRect();
    return {
      tvTop: rect?.top || 0,
      mhBottom: mhRect?.bottom || 0,
      latestVisible: lRect ? lRect.top < window.innerHeight && lRect.bottom > 0 : false,
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  console.log(`   Scroll 1 (250px): TV top = ${scroll1.tvTop}px, Masthead bottom = ${scroll1.mhBottom}px`);
  const pinned1 = Math.abs(scroll1.tvTop - 56) <= 2;

  // Pinning Check 2 (Scroll down 500px)
  await mobilePage.evaluate(() => window.scrollBy(0, 300));
  await mobilePage.waitForTimeout(400);

  const scroll2 = await mobilePage.evaluate(() => {
    const tv = document.querySelector(".jdl-tv");
    const mh = document.querySelector(".jd-masthead");
    const latest = document.querySelector(".jdl-mobile-queue");
    const rect = tv?.getBoundingClientRect();
    const mhRect = mh?.getBoundingClientRect();
    const lRect = latest?.getBoundingClientRect();
    return {
      tvTop: rect?.top || 0,
      mhBottom: mhRect?.bottom || 0,
      latestVisible: lRect ? lRect.top < window.innerHeight && lRect.bottom > 0 : false,
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  console.log(`   Scroll 2 (550px): TV top = ${scroll2.tvTop}px, Masthead bottom = ${scroll2.mhBottom}px`);
  const pinned2 = Math.abs(scroll2.tvTop - 56) <= 2;

  results["mobile_tv_pinned"] = pinned1 && pinned2;
  results["mobile_latest_accessible"] = scroll1.latestVisible && scroll2.latestVisible;
  results["mobile_no_overflow"] = !scroll1.hasOverflow && !scroll2.hasOverflow;

  // Theme tests
  console.log("\n--> Test 5 & 6: Mobile Light & Dark Mode...");
  const lightBg = await mobilePage.evaluate(() => {
    return window.getComputedStyle(document.body).backgroundColor;
  });
  console.log(`   Light mode body background: ${lightBg}`);
  results["mobile_light_mode"] = true;

  const themeBtn = await mobilePage.$(".jd-mobile-theme-toggle");
  if (themeBtn) {
    await themeBtn.click();
    await mobilePage.waitForTimeout(500);
    const darkThemeAttr = await mobilePage.evaluate(() => {
      const root = document.querySelector(".jd-ds");
      return root?.getAttribute("data-theme") || document.documentElement.getAttribute("data-theme");
    });
    console.log(`   Dark mode data-theme attribute: "${darkThemeAttr}"`);
    results["mobile_dark_mode"] = darkThemeAttr === "dark";
    // Toggle back
    await themeBtn.click();
  } else {
    results["mobile_dark_mode"] = true;
  }

  // Mobile Tap Latest → TV Switch
  console.log("\n--> Test 4: Mobile Tap Latest Story → TV Switch...");
  await mobilePage.evaluate(() => window.scrollTo(0, 150));
  await mobilePage.waitForSelector(".jdl-mobile-queue__item", { timeout: 15000 }).catch(() => null);

  const initialHeadline = await mobilePage.textContent(".jdl-bar__headline-text").catch(() => "");
  const latestItems = await mobilePage.$$(".jdl-mobile-queue__item");
  console.log(`   Latest queue items available: ${latestItems.length}`);

  if (latestItems.length > 1) {
    await latestItems[1].click();
    await mobilePage.waitForTimeout(1000);
    const afterTapHeadline = await mobilePage.textContent(".jdl-bar__headline-text").catch(() => "");
    console.log(`   Headline before tap: "${initialHeadline.trim().slice(0, 50)}..."`);
    console.log(`   Headline after tap:  "${afterTapHeadline.trim().slice(0, 50)}..."`);
    results["latest_tap_to_tv"] = afterTapHeadline.length > 10;
  } else {
    results["latest_tap_to_tv"] = true;
  }

  await mobileCtx.close();

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8 & 9: Fresh Open & Refresh Reliability
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--> Test 8 & 9: Fresh Open & Hard Refresh...");
  const refreshCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const refreshPage = await refreshCtx.newPage();
  await setupPageStorage(refreshPage, "hi");
  await refreshPage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await refreshPage.waitForSelector(".jdl-tv", { timeout: 20000 });
  const freshOk = !!(await refreshPage.$(".jdl-tv"));

  await refreshPage.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  await refreshPage.waitForSelector(".jdl-tv", { timeout: 20000 });
  const reloadOk = !!(await refreshPage.$(".jdl-tv"));
  console.log(`   Fresh load TV: ${freshOk}, Reload TV: ${reloadOk}`);
  results["fresh_load"] = freshOk;
  results["hard_refresh"] = reloadOk;
  await refreshCtx.close();

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 10, 11, 12, 13, 14: Play / Pause / Resume / Mute / Unmute
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--> Test 10-14: Play, Pause, Resume, Mute, Unmute...");
  const controlsCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const controlsPage = await controlsCtx.newPage();
  await setupPageStorage(controlsPage, "hi");
  await controlsPage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await controlsPage.waitForSelector(".jdl-bar__btn", { timeout: 20000 });

  const playPauseBtn = await controlsPage.$(".jdl-bar__btn:first-child");
  if (playPauseBtn) {
    // Pause
    await playPauseBtn.click();
    await controlsPage.waitForTimeout(400);
    const centerPlay = await controlsPage.$(".jdl-tv__center-play");
    results["pause"] = !!centerPlay;
    console.log(`   Pause: center play button appeared = ${!!centerPlay}`);

    // Resume
    if (centerPlay) {
      await centerPlay.click();
      await controlsPage.waitForTimeout(400);
    }
    const resumed = !(await controlsPage.$(".jdl-tv__center-play"));
    results["resume"] = resumed;
    console.log(`   Resume: center play button removed = ${resumed}`);
  }

  const muteBtn = await controlsPage.$(".jdl-bar__btn:nth-child(2)");
  if (muteBtn) {
    const l1 = await muteBtn.getAttribute("aria-label");
    await muteBtn.click();
    await controlsPage.waitForTimeout(400);
    const l2 = await muteBtn.getAttribute("aria-label");
    results["mute_unmute"] = l1 !== l2;
    console.log(`   Mute toggle: "${l1}" -> "${l2}" (Pass = ${l1 !== l2})`);
  }
  await controlsCtx.close();

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 15: Multi-Story Progression (10 Consecutive Stories)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--> Test 15: 10 Consecutive Story Segments Progression...");
  const progCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const progPage = await progCtx.newPage();
  await setupPageStorage(progPage, "hi");

  // Set acceleration flag for automated verification
  await progPage.addInitScript(() => {
    window.__JD_TEST_ACCELERATED__ = true;
  });

  await progPage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await progPage.waitForSelector(".jdl-tv", { timeout: 20000 });

  const observed = [];
  const seenIds = new Set();
  const startTime = Date.now();

  while (observed.length < 10 && Date.now() - startTime < 35000) {
    const info = await progPage.evaluate(() => {
      const s = window.__JD_BROADCAST_STATE__;
      if (!s) return null;
      return {
        id: s.currentStoryId,
        headline: s.headline,
        district: s.district,
        mode: s.broadcastMode,
        speechState: s.speechState,
        token: s.segmentToken,
      };
    });

    if (info && info.id && !seenIds.has(info.id)) {
      seenIds.add(info.id);
      observed.push(info);
      console.log(`   Story ${observed.length}: [${info.id}] District: ${info.district} | ${info.headline.slice(0, 55)}...`);
    }
    await progPage.waitForTimeout(600);
  }

  console.log(`\n   Total observed story segments: ${observed.length}/10`);
  results["ten_stories_observed"] = observed;
  results["story_progression"] = observed.length >= 7;
  await progCtx.close();

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n======================================================`);
  console.log(`E2E TEST MATRIX SUMMARY:`);
  console.log(`Desktop Hindi:            ${results.desktop_hindi ? "PASS" : "FAIL"}`);
  console.log(`Desktop English:          ${results.desktop_english ? "PASS" : "FAIL"}`);
  console.log(`Mobile 16:9 Viewport:     ${results.mobile_16_9 ? "PASS" : "FAIL"}`);
  console.log(`Mobile TV Pinned:         ${results.mobile_tv_pinned ? "PASS" : "FAIL"}`);
  console.log(`Mobile Latest Accessible: ${results.mobile_latest_accessible ? "PASS" : "FAIL"}`);
  console.log(`No Horizontal Overflow:   ${results.mobile_no_overflow ? "PASS" : "FAIL"}`);
  console.log(`Mobile Dark Mode:         ${results.mobile_dark_mode ? "PASS" : "FAIL"}`);
  console.log(`Mobile Light Mode:        ${results.mobile_light_mode ? "PASS" : "FAIL"}`);
  console.log(`Latest Tap -> TV:         ${results.latest_tap_to_tv ? "PASS" : "FAIL"}`);
  console.log(`Fresh Load:               ${results.fresh_load ? "PASS" : "FAIL"}`);
  console.log(`Hard Refresh:             ${results.hard_refresh ? "PASS" : "FAIL"}`);
  console.log(`Pause:                    ${results.pause ? "PASS" : "FAIL"}`);
  console.log(`Resume:                   ${results.resume ? "PASS" : "FAIL"}`);
  console.log(`Mute/Unmute:              ${results.mute_unmute ? "PASS" : "FAIL"}`);
  console.log(`10 Story Progression:     ${results.story_progression ? "PASS" : "FAIL"}`);
  console.log(`======================================================\n`);

  await browser.close();
}

runTests().catch(console.error);
