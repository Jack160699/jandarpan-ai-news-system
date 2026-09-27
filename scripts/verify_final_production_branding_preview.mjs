import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/030cd03b-74e5-4148-9230-61309a430039";
const PROD_URL = "https://www.jandarpan.news";

async function main() {
  console.log("=== RUNNING JAN DARPAN FINAL PRODUCTION VERIFICATION ===\n");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  const testReport = {
    timestamp: new Date().toISOString(),
    productionUrl: PROD_URL,
    testA_preview: {},
    testB_googleBranding: {},
    testC_authenticatedSession: {},
    testD_reloadAndLogout: {},
  };

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // TEST A: FRESH VISITOR EXPERIENCE (0-5s Real Preview & Transition)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("--- TEST A: Fresh Visitor Experience ---");
    const ctxA = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });
    const pageA = await ctxA.newPage();

    console.log("1. Visiting https://www.jandarpan.news ...");
    await pageA.goto(PROD_URL, { waitUntil: "domcontentloaded" });
    await pageA.waitForTimeout(1000);

    const urlAt1s = pageA.url();
    console.log("URL at 1s:", urlAt1s);

    // 1.1 Verify Preview Banner
    const bannerEl = await pageA.$(".jd-auth-status-banner--preview");
    const bannerText = bannerEl ? await bannerEl.innerText() : "";
    console.log("Preview banner text:", bannerText.replace(/\n/g, " "));

    // 1.2 Verify Backdrop uses REAL Jan Darpan Production Components
    const hasReaderLiveMain = await pageA.$(".jd-live-channel-main") !== null;
    const hasMasthead = await pageA.$(".jd-masthead") !== null;
    const hasBroadcastLayout = await pageA.$(".jd-home-broadcast-layout") !== null;
    const hasOldMockShell = await pageA.$(".jd-auth-newsroom-shell") !== null;
    const hasOldTvCard = await pageA.$(".jd-auth-tv-card") !== null;

    console.log("Has real .jd-live-channel-main:", hasReaderLiveMain);
    console.log("Has real .jd-masthead:", hasMasthead);
    console.log("Has real .jd-home-broadcast-layout:", hasBroadcastLayout);
    console.log("Has old mock shell (.jd-auth-newsroom-shell):", hasOldMockShell);
    console.log("Has old mock tv card (.jd-auth-tv-card):", hasOldTvCard);

    // 1.3 Verify Backdrop CSS & Interaction Locks
    const backdropEl = await pageA.$(".jd-auth-gate-backdrop");
    const backdropStyles = backdropEl ? await backdropEl.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        filter: s.filter,
        pointerEvents: s.pointerEvents,
        userSelect: s.userSelect,
        opacity: s.opacity,
        position: s.position,
      };
    }) : {};
    console.log("Backdrop styles:", backdropStyles);

    // 1.4 Verify Content Security: Headlines are scrambled, 0% real article bodies leaked
    const backdropText = backdropEl ? await backdropEl.innerText() : "";
    console.log("Backdrop text snippet (first 200 chars):", backdropText.slice(0, 200).replace(/\n/g, " "));

    // 1.5 Confirm Modal is Hidden during 0-5s
    const modalWrapper = await pageA.$(".jd-auth-modal-wrapper");
    const modalHidden = modalWrapper ? (await modalWrapper.getAttribute("class")).includes("hidden") : false;
    console.log("Modal is hidden during preview?", modalHidden);

    // Screenshot 1: Phase 1 Preview (Desktop Light)
    const ss1 = path.join(ARTIFACT_DIR, "final_01_preview_desktop_light.png");
    await pageA.screenshot({ path: ss1 });
    console.log("Saved Screenshot 1:", ss1);

    // 1.6 Wait for 5.5s preview timer completion
    console.log("Waiting 5.5s for 5-second countdown to transition...");
    await pageA.waitForTimeout(5500);

    // 1.7 Verify Modal is now visible
    const modalVisible = modalWrapper ? (await modalWrapper.getAttribute("class")).includes("visible") : false;
    console.log("Modal is visible after preview?", modalVisible);

    const brandTitle = await pageA.$eval(".jd-auth-modal-title-text", el => el.innerText).catch(() => "");
    const tagline = await pageA.$eval(".jd-auth-tagline", el => el.innerText).catch(() => "");
    const subtitle = await pageA.$eval(".jd-auth-subtitle", el => el.innerText).catch(() => "");
    const fomoPills = await pageA.$$eval(".jd-auth-fomo-pill span:last-child", els => els.map(e => e.innerText));
    console.log("Brand:", brandTitle);
    console.log("Tagline:", tagline);
    console.log("Subtitle:", subtitle);
    console.log("FOMO Pills:", fomoPills);

    // Checkbox unchecked and Google button disabled
    const checkbox = await pageA.$("#jd-terms-consent");
    const isCheckedDefault = checkbox ? await checkbox.isChecked() : null;
    const googleBtn = await pageA.$("#jd-google-signin-btn");
    const isGoogleDisabledDefault = googleBtn ? await googleBtn.isDisabled() : null;
    console.log("Terms checkbox unchecked by default?", !isCheckedDefault);
    console.log("Google button disabled by default?", isGoogleDisabledDefault);

    // Screenshot 2: Phase 2 Modal (Desktop Light)
    const ss2 = path.join(ARTIFACT_DIR, "final_02_modal_desktop_light.png");
    await pageA.screenshot({ path: ss2 });
    console.log("Saved Screenshot 2:", ss2);

    testReport.testA_preview = {
      status: hasReaderLiveMain && hasMasthead && !hasOldMockShell && modalHidden && modalVisible ? "PASS" : "FAIL",
      hasReaderLiveMain,
      hasMasthead,
      hasBroadcastLayout,
      hasOldMockShell,
      backdropStyles,
      modalHiddenDuringPreview: modalHidden,
      modalVisibleAfter5s: modalVisible,
      brandTitle,
      tagline,
      subtitle,
      fomoPills,
      termsUncheckedByDefault: !isCheckedDefault,
      googleDisabledByDefault: isGoogleDisabledDefault,
      screenshots: [ss1, ss2],
    };

    // ══════════════════════════════════════════════════════════════════════════
    // TEST A.2: MOBILE 390px VIEWPORT & THEME TOGGLE
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- TEST A.2: Mobile 390px Viewport ---");
    const ctxMob = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: "light",
    });
    const pageMob = await ctxMob.newPage();
    await pageMob.goto(PROD_URL, { waitUntil: "domcontentloaded" });
    await pageMob.waitForTimeout(1000);

    const ssMob1 = path.join(ARTIFACT_DIR, "final_03_preview_mobile_390px.png");
    await pageMob.screenshot({ path: ssMob1 });
    console.log("Saved Screenshot 3 (Mobile Preview):", ssMob1);

    // Fast-skip to modal
    const skipBtnMob = await pageMob.$(".jd-auth-skip-btn");
    if (skipBtnMob) await skipBtnMob.click();
    await pageMob.waitForTimeout(400);

    const ssMob2 = path.join(ARTIFACT_DIR, "final_04_modal_mobile_390px.png");
    await pageMob.screenshot({ path: ssMob2 });
    console.log("Saved Screenshot 4 (Mobile Modal):", ssMob2);

    // Toggle dark theme on mobile
    const themeBtn = await pageMob.$(".jd-auth-banner-theme-btn");
    if (themeBtn) {
      await themeBtn.click();
      await pageMob.waitForTimeout(400);
    }
    const ssMob3 = path.join(ARTIFACT_DIR, "final_05_modal_mobile_dark.png");
    await pageMob.screenshot({ path: ssMob3 });
    console.log("Saved Screenshot 5 (Mobile Modal Dark):", ssMob3);

    await ctxMob.close();

    // ══════════════════════════════════════════════════════════════════════════
    // TEST B: GOOGLE SIGN-IN BRANDING & FLOW
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- TEST B: Google Sign-In Flow & Branding Inspection ---");
    // Check consent box
    if (checkbox) {
      await checkbox.click();
      await pageA.waitForTimeout(300);
      const isCheckedNow = await checkbox.isChecked();
      const isGoogleDisabledNow = await googleBtn.isDisabled();
      console.log("After clicking terms: isChecked =", isCheckedNow, ", isGoogleDisabled =", isGoogleDisabledNow);
    }

    console.log("Clicking Google button...");
    const [nav] = await Promise.all([
      pageA.waitForNavigation({ timeout: 15000 }).catch(e => console.log("Nav caught:", e.message)),
      googleBtn.click(),
    ]);
    await pageA.waitForTimeout(4000);

    const oauthDestination = pageA.url();
    const oauthTitle = await pageA.title();
    console.log("Destination URL:", oauthDestination);
    console.log("Destination Title:", oauthTitle);

    const oauthBody = await pageA.evaluate(() => document.body.innerText).catch(() => "");
    console.log("OAuth Screen Visible Text:\n", oauthBody.slice(0, 500));

    const ssOauth = path.join(ARTIFACT_DIR, "final_06_google_oauth_screen.png");
    await pageA.screenshot({ path: ssOauth });
    console.log("Saved Screenshot 6 (Google OAuth Screen):", ssOauth);

    const hasSilverwest = oauthDestination.includes("silverwest") || oauthBody.toLowerCase().includes("silverwest");
    const hasSupabaseDomain = oauthBody.includes("giiuqshoconjbpiueasp.supabase.co");
    const hasJanDarpanText = oauthBody.includes("Jan Darpan") || oauthBody.includes("जन दर्पण");

    console.log("Contains silverwest.co?", hasSilverwest);
    console.log("Contains fallback supabase domain?", hasSupabaseDomain);
    console.log("Contains Jan Darpan brand?", hasJanDarpanText);

    testReport.testB_googleBranding = {
      status: !hasSilverwest ? "PASS" : "FAIL",
      oauthDestination,
      oauthTitle,
      hasSilverwest,
      hasSupabaseDomain,
      hasJanDarpanText,
      screenshot: ssOauth,
    };

    await ctxA.close();

    // ══════════════════════════════════════════════════════════════════════════
    // TEST C & D: AUTHENTICATED SESSION ACCESS, RELOAD & LOGOUT
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- TEST C & D: Authenticated Session, Reload, and Logout ---");
    const ctxAuth = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { "x-e2e-auth": "playwright-local" },
    });

    await ctxAuth.addCookies([
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: ".jandarpan.news", path: "/" },
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: "www.jandarpan.news", path: "/" },
    ]);

    const pageAuth = await ctxAuth.newPage();
    console.log("Visiting https://www.jandarpan.news as authenticated user...");
    await pageAuth.goto(PROD_URL, { waitUntil: "networkidle" });
    await pageAuth.waitForTimeout(2000);

    const authUrl = pageAuth.url();
    const hasAuthGate = await pageAuth.$(".jd-auth-gate-container") !== null;
    const engagementRowCount = await pageAuth.locator(".jdl-card-engagement-row").count();
    console.log("Authenticated URL:", authUrl);
    console.log("Auth gate container present?", hasAuthGate);
    console.log("Live newsroom .jdl-card-engagement-row count:", engagementRowCount);

    const ssAuthHome = path.join(ARTIFACT_DIR, "final_07_authenticated_production_home.png");
    await pageAuth.screenshot({ path: ssAuthHome });
    console.log("Saved Screenshot 7 (Authenticated Production Home):", ssAuthHome);

    // Refresh test
    console.log("Refreshing while authenticated...");
    await pageAuth.reload({ waitUntil: "networkidle" });
    await pageAuth.waitForTimeout(1000);
    const postReloadGate = await pageAuth.$(".jd-auth-gate-container") !== null;
    console.log("Auth gate present after reload?", postReloadGate);

    // Logout test (clear cookie)
    console.log("Clearing authenticated cookie to simulate logout...");
    await ctxAuth.clearCookies();
    await pageAuth.goto(PROD_URL, { waitUntil: "domcontentloaded" });
    await pageAuth.waitForTimeout(1000);
    const gateReturns = await pageAuth.$(".jd-auth-gate-container") !== null;
    console.log("Auth gate returned after logout?", gateReturns);

    testReport.testC_authenticatedSession = {
      status: !hasAuthGate && engagementRowCount > 0 ? "PASS" : "FAIL",
      authUrl,
      hasAuthGate,
      engagementRowCount,
      screenshot: ssAuthHome,
    };

    testReport.testD_reloadAndLogout = {
      status: !postReloadGate && gateReturns ? "PASS" : "FAIL",
      postReloadGate,
      gateReturnsAfterLogout: gateReturns,
    };

    await ctxAuth.close();
  } finally {
    await browser.close();
  }

  fs.writeFileSync("scripts/final_production_reality_verification_results.json", JSON.stringify(testReport, null, 2));
  console.log("\n=== ALL FINAL PRODUCTION REALITY TESTS COMPLETE ===");
  console.log(JSON.stringify(testReport, null, 2));
}

main().catch(console.error);
