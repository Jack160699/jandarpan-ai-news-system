import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function verifyProduction() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });

  const PROD_URL = "https://www.jandarpan.news";
  console.log(`=== STARTING PRODUCTION VERIFICATION ON ${PROD_URL} ===`);

  // 1. DESKTOP AUDIT (1440x900)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "hi-IN",
  });
  const page = await context.newPage();

  // Attach SpeechSynthesis recorder & dismiss non-essential prompt
  await page.addInitScript(() => {
    localStorage.setItem("jd-ds-perm-notify-v1", "1");
    localStorage.setItem("jd-ds-perm-loc-v1", "1");
    localStorage.setItem("jdl_audio_unlocked", "1");

    window.__speechLog = [];
    window.__speechState = { speaking: false, paused: false, calls: 0, cancelCalls: 0 };

    const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
    const originalCancel = window.speechSynthesis.cancel.bind(window.speechSynthesis);

    window.speechSynthesis.speak = function(utterance) {
      window.__speechLog.push({
        action: "speak",
        text: utterance.text,
        time: Date.now()
      });
      window.__speechState.speaking = true;
      window.__speechState.calls++;

      if (utterance.onstart) {
        setTimeout(() => utterance.onstart({ type: "start" }), 50);
      }
      return originalSpeak(utterance);
    };

    window.speechSynthesis.cancel = function() {
      window.__speechLog.push({ action: "cancel", time: Date.now() });
      window.__speechState.speaking = false;
      window.__speechState.cancelCalls++;
      return originalCancel();
    };
  });

  const navStart = Date.now();
  const resp = await page.goto(PROD_URL, { waitUntil: "domcontentloaded" });
  const domLoadedTime = Date.now() - navStart;
  const status = resp?.status() || 0;
  console.log(`[PROD DESKTOP] Response Status: ${status}, DOMContentLoaded in: ${domLoadedTime}ms`);

  // Measure performance timings via Navigation Timing API
  const perfMetrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    if (!nav) return null;
    return {
      dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
      tcp: Math.round(nav.connectEnd - nav.connectStart),
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      download: Math.round(nav.responseEnd - nav.responseStart),
      domInteractive: Math.round(nav.domInteractive),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
    };
  });
  console.log("[PROD DESKTOP] Navigation Metrics:", JSON.stringify(perfMetrics, null, 2));

  // Wait for Live TV shell
  const tvMountStart = Date.now();
  await page.waitForSelector(".jd-home-broadcast-tv", { timeout: 15000 });
  const tvMountTime = Date.now() - tvMountStart;
  console.log(`[PROD DESKTOP] Live TV shell mounted in: ${tvMountTime}ms`);

  // Wait 2.5s for initial story render & speech
  await page.waitForTimeout(2500);

  // Inspect Live TV UI Elements
  const tvDetails = await page.evaluate(() => {
    const headline = document.querySelector(".jdl-headline__text")?.textContent?.trim() || "";
    const district = document.querySelector(".jdl-headline__district")?.textContent?.trim() || "";
    const logoSrc = document.querySelector(".jdl-logo-badge__icon")?.getAttribute("src") || "";
    const timeText = document.querySelector(".jdl-logo-badge__time")?.textContent?.trim() || "";
    const hasScreenArea = !!document.querySelector(".jdl-tv__screen-area");
    const hasStudioBg = !!document.querySelector(".jdl-tv__studio-bg");
    const mediaImg = document.querySelector(".jdl-media__img")?.getAttribute("src") || "";
    const playBtnLabel = document.querySelector(".jdl-bar__btn[aria-label*='रोकें'], .jdl-bar__btn[aria-label*='चलाएं'], .jdl-bar__btn[aria-label*='Pause'], .jdl-bar__btn[aria-label*='Play']")?.getAttribute("aria-label") || "";
    const soundBtnLabel = document.querySelector(".jdl-bar__btn[aria-label*='म्यूट'], .jdl-bar__btn[aria-label*='आवाज़ चालू'], .jdl-bar__btn[aria-label*='sound'], .jdl-bar__btn[aria-label*='Mute']")?.getAttribute("aria-label") || "";

    return { headline, district, logoSrc, timeText, hasScreenArea, hasStudioBg, mediaImg, playBtnLabel, soundBtnLabel };
  });
  console.log("[PROD DESKTOP] TV State:", JSON.stringify(tvDetails, null, 2));

  await page.screenshot({ path: "prod_desktop_initial_verified.png" });
  console.log("[PROD DESKTOP] Saved prod_desktop_initial_verified.png");

  // Inspect speech
  let speechLog = await page.evaluate(() => window.__speechLog);
  console.log(`[PROD DESKTOP] Speech log count: ${speechLog.length}`);
  const speaks = speechLog.filter(s => s.action === "speak");
  if (speaks.length > 0) {
    console.log("[PROD DESKTOP] Active spoken script:", speaks[0].text);
  }

  // TEST PAUSE
  console.log("[PROD DESKTOP] --- Testing Pause ---");
  const pauseBtn = await page.$(".jdl-bar__btn[aria-label*='रोकें'], .jdl-bar__btn[aria-label*='Pause']");
  if (pauseBtn) {
    await pauseBtn.click({ force: true });
    await page.waitForTimeout(800);

    const pauseCheck = await page.evaluate(() => {
      const isSpeaking = window.__speechState.speaking;
      const lastAction = window.__speechLog[window.__speechLog.length - 1];
      const headline = document.querySelector(".jdl-headline__text")?.textContent?.trim();
      const playBtnLabel = document.querySelector(".jdl-bar__btn[aria-label*='चलाएं'], .jdl-bar__btn[aria-label*='Play']")?.getAttribute("aria-label");
      return { isSpeaking, lastAction, headline, playBtnLabel };
    });
    console.log("[PROD DESKTOP] After Pause:", JSON.stringify(pauseCheck, null, 2));

    await page.waitForTimeout(2500);
    const headlineAfterPauseWait = await page.evaluate(() => document.querySelector(".jdl-headline__text")?.textContent?.trim());
    console.log("[PROD DESKTOP] Story advancement frozen while paused:", headlineAfterPauseWait === pauseCheck.headline);

    // TEST RESUME
    console.log("[PROD DESKTOP] --- Testing Resume ---");
    const resumeBtn = await page.$(".jdl-bar__btn[aria-label*='चलाएं'], .jdl-bar__btn[aria-label*='Play']");
    if (resumeBtn) {
      await resumeBtn.click({ force: true });
      await page.waitForTimeout(1200);

      const resumeCheck = await page.evaluate(() => {
        const headline = document.querySelector(".jdl-headline__text")?.textContent?.trim();
        const playBtnLabel = document.querySelector(".jdl-bar__btn[aria-label*='रोकें'], .jdl-bar__btn[aria-label*='Pause']")?.getAttribute("aria-label");
        const lastAction = window.__speechLog[window.__speechLog.length - 1];
        return { headline, playBtnLabel, lastAction };
      });
      console.log("[PROD DESKTOP] After Resume:", JSON.stringify(resumeCheck, null, 2));
    }
  }

  // TEST MUTE
  console.log("[PROD DESKTOP] --- Testing Mute ---");
  const muteBtn = await page.$(".jdl-bar__btn[aria-label*='म्यूट'], .jdl-bar__btn[aria-label*='Mute']");
  if (muteBtn) {
    await muteBtn.click({ force: true });
    await page.waitForTimeout(800);

    const muteCheck = await page.evaluate(() => {
      const lastAction = window.__speechLog[window.__speechLog.length - 1];
      const soundBtnLabel = document.querySelector(".jdl-bar__btn[aria-label*='चालू'], .jdl-bar__btn[aria-label*='Turn on']")?.getAttribute("aria-label");
      return { lastAction, soundBtnLabel };
    });
    console.log("[PROD DESKTOP] After Mute:", JSON.stringify(muteCheck, null, 2));

    // TEST UNMUTE
    console.log("[PROD DESKTOP] --- Testing Unmute ---");
    const unmuteBtn = await page.$(".jdl-bar__btn[aria-label*='चालू'], .jdl-bar__btn[aria-label*='Turn on']");
    if (unmuteBtn) {
      await unmuteBtn.click({ force: true });
      await page.waitForTimeout(1000);
      const unmuteCheck = await page.evaluate(() => {
        const isSpeaking = window.__speechState.speaking;
        return { isSpeaking };
      });
      console.log("[PROD DESKTOP] After Unmute:", JSON.stringify(unmuteCheck, null, 2));
    }
  }

  // CHECK ALL SPOKEN TEXT FOR NUMBERING
  console.log("[PROD DESKTOP] --- Checking for Numbering in all recorded speeches ---");
  const allSpeeches = await page.evaluate(() => window.__speechLog.filter(s => s.action === "speak").map(s => s.text));
  let hasNumbering = false;
  for (const s of allSpeeches) {
    console.log("Spoken:", s);
    if (/नंबर\s*\d+|news\s*number|story\s*number/i.test(s)) {
      hasNumbering = true;
      console.error("FAIL: Found numbering:", s);
    }
  }
  if (!hasNumbering) {
    console.log("SUCCESS: 0 spoken utterances contained numbering!");
  }

  await page.screenshot({ path: "prod_desktop_after_lifecycle_verified.png" });
  await context.close();

  // 2. MOBILE AUDIT (390x844)
  console.log("[PROD MOBILE] === Testing Mobile Viewport (390x844) ===");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "hi-IN",
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.addInitScript(() => {
    localStorage.setItem("jd-ds-perm-notify-v1", "1");
    localStorage.setItem("jd-ds-perm-loc-v1", "1");
  });

  const mStart = Date.now();
  await mobilePage.goto(PROD_URL, { waitUntil: "domcontentloaded" });
  console.log(`[PROD MOBILE] DOMContentLoaded in: ${Date.now() - mStart}ms`);

  await mobilePage.waitForSelector(".jd-home-broadcast-tv", { timeout: 15000 });
  await mobilePage.waitForTimeout(2500);

  const mobileMetrics = await mobilePage.evaluate(() => {
    const el = document.querySelector(".jdl-tv");
    const rect = el?.getBoundingClientRect();
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    return {
      rect: rect ? { width: Math.round(rect.width), height: Math.round(rect.height), ratio: (rect.width / rect.height).toFixed(2) } : null,
      hasOverflow: scrollWidth > clientWidth,
      scrollWidth,
      clientWidth
    };
  });
  console.log("[PROD MOBILE] Mobile Metrics:", JSON.stringify(mobileMetrics, null, 2));

  await mobilePage.screenshot({ path: "prod_mobile_verified.png" });
  console.log("[PROD MOBILE] Saved prod_mobile_verified.png");

  await mobileContext.close();
  await browser.close();
  console.log("=== PRODUCTION VERIFICATION COMPLETE ===");
}

verifyProduction().catch(err => {
  console.error("Production verification failed:", err);
  process.exit(1);
});
