import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const LOCAL_URL = "http://localhost:3005";
const ARTIFACT_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d";

async function runAcceptanceTest() {
  console.log("=== JAN DARPAN INTERACTIVE TV TAP BEHAVIOR ACCEPTANCE TEST ===");
  console.log("Testing on local server:", LOCAL_URL);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--autoplay-policy=no-user-gesture-required"]
  });

  const results = {
    step1_default_playing: false,
    step1_no_play_pause_outside: false,
    step1_no_mute_outside: false,
    step1_channel_bug_visible: false,
    step2_tap_tv_pauses: false,
    step3_paused_overlay_visible: false,
    step3_anchor_face_not_covered: false,
    step4_share_stays_paused: false,
    step5_whatsapp_stays_paused: false,
    step6_tap_non_control_resumes: false,
    step7_resume_button_works: false,
    step8_debounce_no_double_toggle: false,
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
      } catch {}
    });

    const page = await context.newPage();

    // Track console warnings/errors
    page.on("console", msg => {
      if (msg.type() === "error") console.log(`[Browser Error] ${msg.text()}`);
    });

    console.log("Navigating to page...");
    await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Dismiss permission modal if present
    try {
      const notNow = await page.$('button:has-text("अभी नहीं"), button:has-text("Later")');
      if (notNow) {
        await notNow.click();
        await page.waitForTimeout(500);
      }
    } catch {}

    // STEP 1: Verify Default State (Playing)
    console.log("\n--- STEP 1: Verifying Default Playing State ---");
    const instr = await page.$('[data-testid="jd-broadcast-instrumentation"]');
    const isPlayingInitial = await instr?.getAttribute("data-is-playing");
    console.log("Initial data-is-playing:", isPlayingInitial);
    results.step1_default_playing = (isPlayingInitial === "true");

    const outsidePlayBtn = await page.$('[data-testid="jdl-play-pause-btn"]');
    const outsideMuteBtn = await page.$('[data-testid="jdl-mute-btn"]');
    results.step1_no_play_pause_outside = (outsidePlayBtn === null);
    results.step1_no_mute_outside = (outsideMuteBtn === null);
    console.log("No Play/Pause button outside TV:", results.step1_no_play_pause_outside);
    console.log("No Mute button outside TV:", results.step1_no_mute_outside);

    const channelBug = await page.$(".jdl-tv__channel-bug");
    results.step1_channel_bug_visible = !!channelBug;
    console.log("Channel logo/bug in upper-right visible:", results.step1_channel_bug_visible);

    // Capture clean playing screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_tv_state_playing.png") });

    // STEP 2: Tap on TV -> Pause
    console.log("\n--- STEP 2: Tap on TV Viewing Area -> Pause ---");
    const tvViewport = await page.$(".jdl-tv__viewport");
    if (!tvViewport) throw new Error("TV viewport not found");

    // Click on the story screen area (X: 100, Y: 80)
    await page.click(".jdl-tv__screen-area");
    await page.waitForTimeout(600);

    const isPlayingAfterTap = await instr?.getAttribute("data-is-playing");
    console.log("data-is-playing after 1st tap:", isPlayingAfterTap);
    results.step2_tap_tv_pauses = (isPlayingAfterTap === "false");

    // STEP 3: Verify Paused Overlay
    console.log("\n--- STEP 3: Verify Paused Overlay Inside TV ---");
    const pausedOverlay = await page.$('[data-testid="jdl-tv-paused-overlay"]');
    results.step3_paused_overlay_visible = !!pausedOverlay;
    console.log("Paused overlay visible:", results.step3_paused_overlay_visible);

    if (pausedOverlay) {
      // Check geometry: overlay must NOT cover anchor face
      const overlayBox = await pausedOverlay.boundingBox();
      const studioImg = await page.$(".jdl-tv__studio-img");
      const vpBox = await tvViewport.boundingBox();

      if (overlayBox && vpBox) {
        console.log(`Overlay rect: x=${overlayBox.x}, y=${overlayBox.y}, w=${overlayBox.width}, h=${overlayBox.height}`);
        console.log(`TV viewport rect: x=${vpBox.x}, y=${vpBox.y}, w=${vpBox.width}, h=${vpBox.height}`);
        // Anchor's face is located on the right side of the studio (x > vpBox.x + vpBox.width * 0.65)
        const anchorFaceLeftX = vpBox.x + vpBox.width * 0.62;
        const overlayRightX = overlayBox.x + overlayBox.width;
        const doesNotCoverAnchor = overlayRightX <= anchorFaceLeftX + 20;
        results.step3_anchor_face_not_covered = doesNotCoverAnchor;
        console.log(`Anchor face starts around X=${anchorFaceLeftX.toFixed(1)}, Overlay ends at X=${overlayRightX.toFixed(1)}`);
        console.log("Anchor face is completely uncovered:", doesNotCoverAnchor);
      }
    }

    // Capture paused state screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_tv_state_paused.png") });

    // STEP 4: Tap Share inside Paused Overlay
    console.log("\n--- STEP 4: Tap Share Button Inside Overlay ---");
    const shareBtn = await page.$('[data-testid="jdl-tv-share-btn"]');
    if (shareBtn) {
      await shareBtn.click();
      await page.waitForTimeout(400);
      const isPlayingAfterShare = await instr?.getAttribute("data-is-playing");
      results.step4_share_stays_paused = (isPlayingAfterShare === "false");
      console.log("Playback remains paused after Share:", results.step4_share_stays_paused);
    } else {
      console.log("Share button not found!");
    }

    // STEP 5: Tap WhatsApp inside Paused Overlay
    console.log("\n--- STEP 5: Tap WhatsApp Button Inside Overlay ---");
    const waBtn = await page.$('[data-testid="jdl-tv-whatsapp-btn"]');
    if (waBtn) {
      // Stub window.open to prevent popup navigation in test
      await page.evaluate(() => {
        window.__WA_OPENED__ = false;
        window.open = () => { window.__WA_OPENED__ = true; return null; };
      });
      await waBtn.click();
      await page.waitForTimeout(400);
      const isPlayingAfterWA = await instr?.getAttribute("data-is-playing");
      const waOpened = await page.evaluate(() => window.__WA_OPENED__);
      results.step5_whatsapp_stays_paused = (isPlayingAfterWA === "false" && waOpened === true);
      console.log("WhatsApp executed and playback remains paused:", results.step5_whatsapp_stays_paused);
    }

    // STEP 6: Tap Non-Control Area to Resume
    console.log("\n--- STEP 6: Tap Non-Control Area to Resume ---");
    // Click on the lower background area or top corner of viewport (non-button area)
    await page.mouse.click(30, 100);
    await page.waitForTimeout(600);
    const isPlayingAfterNonControlTap = await instr?.getAttribute("data-is-playing");
    results.step6_tap_non_control_resumes = (isPlayingAfterNonControlTap === "true");
    console.log("Playback resumed after tapping non-control area:", results.step6_tap_non_control_resumes);

    // STEP 7: Tap to Pause, then Tap Resume Button
    console.log("\n--- STEP 7: Tap TV -> Pause -> Tap Resume Button ---");
    await page.mouse.click(30, 100);
    await page.waitForTimeout(600);
    const isPlayingPausedAgain = await instr?.getAttribute("data-is-playing");
    console.log("Paused again:", isPlayingPausedAgain === "false");

    const resumeBtn = await page.$('[data-testid="jdl-tv-resume-btn"]');
    if (resumeBtn) {
      await resumeBtn.click();
      await page.waitForTimeout(600);
      const isPlayingResumedViaBtn = await instr?.getAttribute("data-is-playing");
      results.step7_resume_button_works = (isPlayingResumedViaBtn === "true");
      console.log("Resume button resumed broadcast:", results.step7_resume_button_works);
    }

    // STEP 8: Test Rapid Double Tap (Debounce)
    console.log("\n--- STEP 8: Rapid Double-Tap Debounce Test ---");
    // Rapid double click within 100ms
    await page.mouse.click(50, 100);
    await page.mouse.click(50, 100);
    await page.waitForTimeout(600);
    const isPlayingDebounced = await instr?.getAttribute("data-is-playing");
    // Should be paused (exactly one state transition)
    results.step8_debounce_no_double_toggle = (isPlayingDebounced === "false");
    console.log("Rapid double-tap handled cleanly as single pause:", results.step8_debounce_no_double_toggle);

    // Resume for viewport tests
    await page.mouse.click(50, 100);
    await page.waitForTimeout(500);

    // Multi-viewport Tests
    console.log("\n--- MULTI-VIEWPORT TESTS ---");
    const viewports = [
      { name: "mobile_390x844", width: 390, height: 844 },
      { name: "mobile_375x844", width: 375, height: 844 },
      { name: "mobile_360x800", width: 360, height: 800 },
      { name: "desktop_1440x900", width: 1440, height: 900 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(400);

      // Verify TV is present and responsive
      const vpTv = await page.$(".jdl-tv__viewport");
      const box = await vpTv?.boundingBox();
      console.log(`Viewport ${vp.name}: TV rendered at ${box?.width}x${box?.height}`);

      // Pause to see overlay
      await page.click(".jdl-tv__screen-area");
      await page.waitForTimeout(400);

      const shotPath = path.join(ARTIFACT_DIR, `live_tv_tap_${vp.name}.png`);
      await page.screenshot({ path: shotPath });

      // Resume
      await page.mouse.click(20, (box?.y || 0) + 40);
      await page.waitForTimeout(400);

      results.viewports_verified.push({
        viewport: vp.name,
        tvWidth: box?.width,
        tvHeight: box?.height,
        screenshot: shotPath
      });
    }

    await browser.close();

    const reportPath = path.join(ARTIFACT_DIR, "interactive_tv_tap_qa_report.json");
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log("\nQA Report saved to:", reportPath);
    console.log("All Acceptance Criteria Results:", JSON.stringify(results, null, 2));

  } catch (err) {
    console.error("Test failed with error:", err);
    results.errors.push(err.message);
    await browser.close();
  }
}

runAcceptanceTest();
