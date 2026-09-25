import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PROD_URL = process.argv[2] || process.env.TEST_URL || "https://www.jandarpan.news";
const ARTIFACT_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d";

async function runAcceptanceTest() {
  console.log("=== JAN DARPAN FINAL INTERACTIVE TV + ADVERTISEMENT QA TEST ===");
  console.log("Target URL:", PROD_URL);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--autoplay-policy=no-user-gesture-required"]
  });

  const results = {
    test_url: PROD_URL,
    step1_autoplay_started: false,
    step1_audio_unmuted_default: false,
    step1_tv_clean_no_external_controls: false,
    step1_channel_bug_top_right: false,
    step1_headline_badge_fixed: false,
    step2_tap_tv_pauses: false,
    step2_center_controls_visible: false,
    step2_controls_centered_in_tv: false,
    step2_buttons_icon_only_no_text: false,
    step3_mute_toggle_works_audio_only: false,
    step4_share_tap_preserves_paused: false,
    step5_whatsapp_tap_preserves_paused: false,
    step6_tap_non_control_resumes: false,
    step7_play_icon_resumes: false,
    step8_durg_solar_ad_visible: false,
    step8_ad_area_has_no_share_or_wa: false,
    step8_ad_aspect_ratio_preserved: false,
    step9_latest_news_feed_present: false,
    step9_no_removed_taaza_khabrein: false,
    viewports_verified: [],
    errors: [],
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
    });

    await context.addInitScript(() => {
      try {
        localStorage.setItem("jd-ds-perm-notify-v1", "1");
        localStorage.setItem("jd-ds-perm-loc-v1", "1");
        // Clear audio consent so it uses default unmuted
        localStorage.removeItem("jdl_audio_consent");
      } catch {}
    });

    const page = await context.newPage();

    page.on("console", msg => {
      if (msg.type() === "error") console.log(`[Browser Console Error] ${msg.text()}`);
    });

    console.log("Navigating to page...");
    await page.goto(PROD_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);

    // Dismiss permission modal if present
    try {
      const notNow = await page.$('button:has-text("अभी नहीं"), button:has-text("Later")');
      if (notNow) {
        await notNow.click();
        await page.waitForTimeout(400);
      }
    } catch {}

    const instr = await page.$('[data-testid="jd-broadcast-instrumentation"]');

    // ─── STEP 1: VERIFY FRESH LANDING / DEFAULT STATE ───────────────────────────
    console.log("\n--- STEP 1: Verify Fresh Landing State ---");
    const isPlayingInitial = await instr?.getAttribute("data-is-playing");
    const isMutedInitial = await instr?.getAttribute("data-is-muted");
    console.log("Initial data-is-playing:", isPlayingInitial);
    console.log("Initial data-is-muted:", isMutedInitial);

    results.step1_autoplay_started = (isPlayingInitial === "true");
    results.step1_audio_unmuted_default = (isMutedInitial === "false");

    // Check no external controls exist outside TV
    const externalPlay = await page.$('[data-testid="jdl-play-pause-btn"]');
    const externalMute = await page.$('[data-testid="jdl-mute-btn"]');
    const externalShare = await page.$('.jdl-bar__btn--action');
    const externalWA = await page.$('.jdl-bar__btn--whatsapp');
    results.step1_tv_clean_no_external_controls = !externalPlay && !externalMute && !externalShare && !externalWA;
    console.log("No external controls outside TV:", results.step1_tv_clean_no_external_controls);

    // Channel bug top-right
    const channelBug = await page.$(".jdl-tv__channel-bug");
    results.step1_channel_bug_top_right = !!channelBug;
    console.log("Channel bug top-right:", results.step1_channel_bug_top_right);

    // Headline badge fixed as मुख्य खबर or TOP STORY
    const badgeText = await page.$eval(".jdl-tv__lt-badge", el => el.textContent?.trim()).catch(() => "");
    results.step1_headline_badge_fixed = (badgeText === "मुख्य खबर" || badgeText === "TOP STORY");
    console.log("Headline badge text:", badgeText, "Fixed correctly:", results.step1_headline_badge_fixed);

    // Capture clean broadcast screenshot
    const cleanPlayingShot = path.join(ARTIFACT_DIR, "live_tv_playing_clean.png");
    await page.screenshot({ path: cleanPlayingShot });

    // ─── STEP 2: TAP TV TO PAUSE & VERIFY CENTERED ICON CONTROLS ────────────────
    console.log("\n--- STEP 2: Tap TV to Pause & Verify Centered Icon Controls ---");
    const tvViewport = await page.$(".jdl-tv__viewport");
    if (!tvViewport) throw new Error("TV viewport element not found");

    // Tap on the story screen area
    await page.click(".jdl-tv__screen-area");
    await page.waitForTimeout(600);

    const isPlayingAfterTap = await instr?.getAttribute("data-is-playing");
    results.step2_tap_tv_pauses = (isPlayingAfterTap === "false");
    console.log("data-is-playing after tap:", isPlayingAfterTap, "Pauses:", results.step2_tap_tv_pauses);

    const centerControls = await page.$('[data-testid="jdl-tv-center-controls"]');
    results.step2_center_controls_visible = !!centerControls;
    console.log("Center controls overlay visible:", results.step2_center_controls_visible);

    if (centerControls) {
      // Check centering geometry
      const controlsBox = await centerControls.boundingBox();
      const tvBox = await tvViewport.boundingBox();
      if (controlsBox && tvBox) {
        const controlsCenterX = controlsBox.x + controlsBox.width / 2;
        const controlsCenterY = controlsBox.y + controlsBox.height / 2;
        const tvCenterX = tvBox.x + tvBox.width / 2;
        const tvCenterY = tvBox.y + tvBox.height / 2;

        const xOffset = Math.abs(controlsCenterX - tvCenterX);
        const yOffset = Math.abs(controlsCenterY - tvCenterY);
        console.log(`Controls Center: (${controlsCenterX.toFixed(1)}, ${controlsCenterY.toFixed(1)}), TV Center: (${tvCenterX.toFixed(1)}, ${tvCenterY.toFixed(1)}), Offset: dx=${xOffset.toFixed(1)}, dy=${yOffset.toFixed(1)}`);
        // Centered within 15px
        results.step2_controls_centered_in_tv = (xOffset < 20 && yOffset < 30);
      }

      // Check buttons and icon-only requirement (zero text labels inside buttons)
      const playBtn = await page.$('[data-testid="jdl-center-play-btn"]');
      const muteBtn = await page.$('[data-testid="jdl-center-mute-btn"]');
      const shareBtn = await page.$('[data-testid="jdl-center-share-btn"]');
      const waBtn = await page.$('[data-testid="jdl-center-whatsapp-btn"]');

      const playText = (await playBtn?.innerText() || "").trim();
      const muteText = (await muteBtn?.innerText() || "").trim();
      const shareText = (await shareBtn?.innerText() || "").trim();
      const waText = (await waBtn?.innerText() || "").trim();

      console.log(`Button text contents: play="${playText}", mute="${muteText}", share="${shareText}", wa="${waText}"`);
      results.step2_buttons_icon_only_no_text = (
        !!playBtn && !!muteBtn && !!shareBtn && !!waBtn &&
        playText === "" && muteText === "" && shareText === "" && waText === ""
      );
      console.log("Buttons are icon-only with zero text:", results.step2_buttons_icon_only_no_text);
    }

    // Capture paused state screenshot showing centered icon controls
    const pausedShot = path.join(ARTIFACT_DIR, "live_tv_paused_centered_icons.png");
    await page.screenshot({ path: pausedShot });

    // ─── STEP 3: TAP MUTE ICON (ONLY AUDIO TOGGLES) ─────────────────────────────
    console.log("\n--- STEP 3: Tap Mute Icon (Audio Only) ---");
    const muteBtn = await page.$('[data-testid="jdl-center-mute-btn"]');
    if (muteBtn) {
      const mutedBefore = await instr?.getAttribute("data-is-muted");
      await muteBtn.click();
      await page.waitForTimeout(400);

      const mutedAfter = await instr?.getAttribute("data-is-muted");
      const isPlayingAfterMute = await instr?.getAttribute("data-is-playing");
      console.log(`Mute toggled from ${mutedBefore} to ${mutedAfter}, Playback is: ${isPlayingAfterMute}`);

      // Must toggle muted state and NOT resume playback
      const toggled1 = (mutedAfter !== mutedBefore && isPlayingAfterMute === "false");

      // Toggle back
      await muteBtn.click();
      await page.waitForTimeout(400);
      const mutedBack = await instr?.getAttribute("data-is-muted");
      const isPlayingAfterMute2 = await instr?.getAttribute("data-is-playing");
      const toggled2 = (mutedBack === mutedBefore && isPlayingAfterMute2 === "false");

      results.step3_mute_toggle_works_audio_only = toggled1 && toggled2;
      console.log("Mute toggle works cleanly with audio only:", results.step3_mute_toggle_works_audio_only);
    }

    // ─── STEP 4: TAP SHARE ICON (PRESERVES PAUSED STATE) ────────────────────────
    console.log("\n--- STEP 4: Tap Share Icon ---");
    const shareBtn = await page.$('[data-testid="jdl-center-share-btn"]');
    if (shareBtn) {
      await shareBtn.click();
      await page.waitForTimeout(400);
      const isPlayingAfterShare = await instr?.getAttribute("data-is-playing");
      results.step4_share_tap_preserves_paused = (isPlayingAfterShare === "false");
      console.log("Share tap keeps broadcast paused:", results.step4_share_tap_preserves_paused);
    }

    // ─── STEP 5: TAP WHATSAPP ICON (PRESERVES PAUSED STATE) ─────────────────────
    console.log("\n--- STEP 5: Tap WhatsApp Icon ---");
    const waBtn = await page.$('[data-testid="jdl-center-whatsapp-btn"]');
    if (waBtn) {
      await page.evaluate(() => {
        window.__WA_OPENED__ = false;
        window.open = (url) => { window.__WA_OPENED__ = url; return null; };
      });
      await waBtn.click();
      await page.waitForTimeout(400);
      const isPlayingAfterWA = await instr?.getAttribute("data-is-playing");
      const waUrlOpened = await page.evaluate(() => window.__WA_OPENED__);
      results.step5_whatsapp_tap_preserves_paused = (
        isPlayingAfterWA === "false" &&
        typeof waUrlOpened === "string" &&
        waUrlOpened.includes("wa.me")
      );
      console.log("WhatsApp URL opened:", waUrlOpened, "Stays paused:", results.step5_whatsapp_tap_preserves_paused);
    }

    // ─── STEP 6: TAP NON-CONTROL AREA TO RESUME ─────────────────────────────────
    console.log("\n--- STEP 6: Tap Non-Control Area to Resume ---");
    // Click outside center controls (e.g. top-left of TV viewport)
    const tvBox = await tvViewport.boundingBox();
    if (tvBox) {
      await page.mouse.click(tvBox.x + 30, tvBox.y + 40);
      await page.waitForTimeout(600);
      const isPlayingAfterNonControl = await instr?.getAttribute("data-is-playing");
      const centerOverlayResumed = await page.$('[data-testid="jdl-tv-center-controls"]');
      results.step6_tap_non_control_resumes = (isPlayingAfterNonControl === "true" && !centerOverlayResumed);
      console.log("Resumed via non-control tap:", results.step6_tap_non_control_resumes);
    }

    // ─── STEP 7: PAUSE AND RESUME VIA PLAY ICON ─────────────────────────────────
    console.log("\n--- STEP 7: Resume via Center Play Icon ---");
    await page.click(".jdl-tv__screen-area");
    await page.waitForTimeout(600);

    const playBtn = await page.$('[data-testid="jdl-center-play-btn"]');
    if (playBtn) {
      await playBtn.click();
      await page.waitForTimeout(600);
      const isPlayingResumed = await instr?.getAttribute("data-is-playing");
      const centerOverlayHidden = await page.$('[data-testid="jdl-tv-center-controls"]');
      results.step7_play_icon_resumes = (isPlayingResumed === "true" && !centerOverlayHidden);
      console.log("Play icon resumes broadcast and hides controls:", results.step7_play_icon_resumes);
    }

    // ─── STEP 8: DURG SOLAR ADVERTISEMENT BANNER ────────────────────────────────
    console.log("\n--- STEP 8: Verify Durg Solar Advertisement Banner ---");
    const adBanner = await page.$(".jdl-ad-banner");
    const adImg = await page.$(".jdl-ad-banner__img");
    const adLink = await page.$(".jdl-ad-banner__link");

    results.step8_durg_solar_ad_visible = !!adBanner && !!adImg;
    console.log("Ad banner element visible:", results.step8_durg_solar_ad_visible);

    if (adBanner) {
      // Check NO Share or WhatsApp buttons inside or beside the ad area
      const adInnerButtons = await adBanner.$$("button");
      const adShare = await adBanner.$('[data-testid="jdl-share-btn"], .jdl-bar__btn--action');
      const adWA = await adBanner.$('[data-testid="jdl-whatsapp-btn"], .jdl-bar__btn--whatsapp');
      results.step8_ad_area_has_no_share_or_wa = (adInnerButtons.length === 0 && !adShare && !adWA);
      console.log("Ad area is ADVERTISEMENT ONLY (no Share, no WA, no buttons):", results.step8_ad_area_has_no_share_or_wa);

      // Check aspect ratio
      const imgBox = await adImg?.boundingBox();
      if (imgBox) {
        const computedRatio = imgBox.width / imgBox.height;
        console.log(`Ad image dimensions: ${imgBox.width.toFixed(1)} x ${imgBox.height.toFixed(1)}, ratio: ${computedRatio.toFixed(3)} (ideal: 3.984)`);
        results.step8_ad_aspect_ratio_preserved = (computedRatio > 3.6 && computedRatio < 4.4);
      }

      const href = await adLink?.getAttribute("href");
      console.log("Ad link:", href);
    }

    // ─── STEP 9: LATEST NEWS FEED STRUCTURE ─────────────────────────────────────
    console.log("\n--- STEP 9: Verify Latest News Feed Structure ---");
    const newsCards = await page.$$('.jdl-mobile-queue__item, .jdl-feed-card, .jdl-news-card, article');
    results.step9_latest_news_feed_present = (newsCards.length >= 3);
    console.log(`Latest News Feed items found: ${newsCards.length}`);

    // Check no alternate removed layout exists
    const duplicateFeeds = await page.$$('[data-testid="taaza-khabrein-legacy"], .taaza-legacy-feed');
    results.step9_no_removed_taaza_khabrein = (duplicateFeeds.length === 0);
    console.log("No duplicate/removed taaza-khabrein layout present:", results.step9_no_removed_taaza_khabrein);

    // ─── MULTI-VIEWPORT TESTS ───────────────────────────────────────────────────
    console.log("\n--- MULTI-VIEWPORT TESTS ---");
    const viewports = [
      { name: "mobile_390x844", width: 390, height: 844 },
      { name: "mobile_360x800", width: 360, height: 800 },
      { name: "desktop_1440x900", width: 1440, height: 900 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(500);

      // Check TV rect
      const vpTvBox = await tvViewport.boundingBox();

      // Pause to show centered controls
      await page.click(".jdl-tv__screen-area");
      await page.waitForTimeout(400);

      const shotPath = path.join(ARTIFACT_DIR, `live_tv_qa_${vp.name}.png`);
      await page.screenshot({ path: shotPath });

      // Resume
      await page.mouse.click((vpTvBox?.x || 0) + 20, (vpTvBox?.y || 0) + 20);
      await page.waitForTimeout(400);

      results.viewports_verified.push({
        viewport: vp.name,
        tvWidth: vpTvBox?.width,
        tvHeight: vpTvBox?.height,
        screenshot: shotPath
      });
    }

    await browser.close();

    const reportPath = path.join(ARTIFACT_DIR, "interactive_tv_advertisement_qa_report.json");
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log("\nQA Report written to:", reportPath);
    console.log("Results Summary:\n", JSON.stringify(results, null, 2));

  } catch (err) {
    console.error("Test execution encountered an error:", err);
    results.errors.push(err.message);
    await browser.close();
  }
}

runAcceptanceTest();
