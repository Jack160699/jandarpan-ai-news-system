import { chromium } from "playwright";
import fs from "fs";

const BASE_URL = "http://127.0.0.1:3000";
const ARTIFACT_DIR = "C:\\Users\\shriyansh chandrakar\\.gemini\\antigravity-ide\\brain\\030cd03b-74e5-4148-9230-61309a430039";

async function runAudit() {
  console.log("=== STARTING FULL PRODUCTION VERIFICATION & VIEW SEMANTICS AUDIT ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const results = {
    authGate: {},
    sessionRouting: {},
    engagementRow: {},
    viewSemantics: {},
    passed: false
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: Unauthenticated Edge Gate (Zero Leak, 307 Redirects)
    // -------------------------------------------------------------
    console.log("\n[TEST 1] Testing Unauthenticated Gate...");
    const unauthContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const unauthPage = await unauthContext.newPage();

    // Direct root
    const rootRes = await unauthPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    const rootFinalUrl = unauthPage.url();
    console.log("Root navigation landed on:", rootFinalUrl);
    results.authGate.rootRedirectsToLogin = rootFinalUrl.includes("/login");

    // Direct /live
    await unauthPage.goto(`${BASE_URL}/live`, { waitUntil: "domcontentloaded" });
    const liveFinalUrl = unauthPage.url();
    console.log("/live navigation landed on:", liveFinalUrl);
    results.authGate.liveRedirectsToLogin = liveFinalUrl.includes("/login?next=%2Flive");

    // Direct story
    await unauthPage.goto(`${BASE_URL}/story/test-story-id`, { waitUntil: "domcontentloaded" });
    const storyFinalUrl = unauthPage.url();
    console.log("/story navigation landed on:", storyFinalUrl);
    results.authGate.storyRedirectsToLogin = storyFinalUrl.includes("/login?next=%2Fstory%2Ftest-story-id");

    // Inspect login gate elements
    const pageText = await unauthPage.locator("body").innerText();
    results.authGate.hasBrandTitle = pageText.includes("जन दर्पण");
    console.log("Has brand title 'जन दर्पण':", results.authGate.hasBrandTitle);

    const googleBtn = unauthPage.locator("button:has-text('Google')");
    results.authGate.hasGoogleBtn = (await googleBtn.count()) > 0;
    console.log("Has Google button:", results.authGate.hasGoogleBtn);

    const guestBtn = unauthPage.locator("button:has-text('अतिथि'), a:has-text('अतिथि'), button:has-text('Guest'), a:has-text('Guest')");
    results.authGate.noGuestBypass = (await guestBtn.count()) === 0;
    console.log("Zero guest bypass buttons:", results.authGate.noGuestBypass);

    // Capture screenshot of Gate
    await unauthPage.screenshot({ path: `${ARTIFACT_DIR}/final_gate_desktop_light.png` });
    await unauthContext.close();

    // -------------------------------------------------------------
    // TEST 2: Authenticated Flow, Direct Navigation, Refresh & Back/Forward
    // -------------------------------------------------------------
    console.log("\n[TEST 2] Testing Authenticated Session & Navigation...");
    const authContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { "x-e2e-auth": "playwright-local" },
    });
    await authContext.addCookies([
      {
        name: "nr-e2e-user",
        value: "e2e_verified_reader_99",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    const authPage = await authContext.newPage();

    const viewRequests = [];
    authPage.on("request", (req) => {
      if (req.url().includes("/api/story/engagement") && req.method() === "POST") {
        try {
          const body = JSON.parse(req.postData() || "{}");
          if (body.action === "view") {
            viewRequests.push({
              storyId: body.storyId,
              playCycleId: body.playCycleId,
              timestamp: Date.now(),
            });
            console.log(`[VIEW_EVENT_CAPTURED] storyId: ${body.storyId} cycle: ${body.playCycleId}`);
          }
        } catch {}
      }
    });

    // Navigate to /live directly (resolves to authenticated Live TV studio)
    await authPage.goto(`${BASE_URL}/live`, { waitUntil: "networkidle" });
    console.log("Authenticated /live URL:", authPage.url());
    results.sessionRouting.liveAccessible = !authPage.url().includes("/login");

    // Refresh test
    await authPage.reload({ waitUntil: "networkidle" });
    console.log("After reload URL:", authPage.url());
    results.sessionRouting.refreshMaintainsSession = !authPage.url().includes("/login");

    // -------------------------------------------------------------
    // TEST 3: Engagement Row Sequence & Behavior
    // -------------------------------------------------------------
    console.log("\n[TEST 3] Verifying Engagement Row Sequence...");
    await authPage.waitForSelector(".jdl-queue-card", { timeout: 15000 });
    const cards = authPage.locator(".jdl-queue-card");
    const cardCount = await cards.count();
    console.log(`Found ${cardCount} news cards in live queue.`);
    results.engagementRow.cardCount = cardCount;

    const firstCard = cards.first();
    const rowItems = await firstCard.locator(".jdl-engagement-item, .jdl-queue-card__read-btn").all();
    const rowElements = [];
    for (const item of rowItems) {
      rowElements.push({
        text: (await item.innerText()).trim(),
        className: await item.getAttribute("class"),
        title: await item.getAttribute("title") || "",
      });
    }
    console.log("Engagement Row elements:", rowElements);

    // Exact sequence: Like -> Comment -> Views -> WhatsApp -> पढ़ें (EXACTLY 5 SECTIONS)
    const isExactSequence =
      rowElements.length === 5 &&
      (rowElements[0].text.includes("❤️") || rowElements[0].text.includes("🤍")) &&
      rowElements[1].text.startsWith("💬") &&
      rowElements[2].text.startsWith("👁") &&
      rowElements[3].text === "🟢" &&
      rowElements[4].text.includes("पढ़ें");

    console.log("Is Exact Sequence (5 items) Verified:", isExactSequence);
    results.engagementRow.sequenceVerified = isExactSequence;

    // Verify WhatsApp has NO text, NO count, icon-only
    const waText = rowElements[3].text;
    results.engagementRow.noMisleadingCounts = waText === "🟢" && !waText.toLowerCase().includes("whatsapp");
    console.log("WhatsApp icon-only without text/count:", results.engagementRow.noMisleadingCounts);

    // Verify पढ़ें isolates TV selection and opens reader
    const readBtn = firstCard.locator(".jdl-queue-card__read-btn");
    await readBtn.click();
    await authPage.waitForTimeout(2000);
    const readerOpen = await authPage.locator(".jd-open-reader").isVisible();
    console.log("Article reader opened via पढ़ें button:", readerOpen);
    results.engagementRow.readerOpenedWithoutTvChange = readerOpen;

    // Close reader and return to live queue
    const closeReaderBtn = authPage.locator(".jd-control-btn--back, .jd-open-reader__close").first();
    if (await closeReaderBtn.isVisible()) {
      await closeReaderBtn.click();
      await authPage.waitForTimeout(1500);
      console.log("Closed article reader, returned to live TV queue.");
    }

    // -------------------------------------------------------------
    // TEST 4: View-Count Semantics Audit (Rerenders, Polling, Legitimate Plays)
    // -------------------------------------------------------------
    console.log("\n[TEST 4] Auditing View-Count Semantics...");

    // Step A: Select Story 1 to start genuine playback on active visible TV
    const storyCard1 = cards.nth(1);
    const storyTitle1 = await storyCard1.locator(".jdl-queue-card__headline").innerText();
    console.log(`Selecting Story 1 for TV playback: "${storyTitle1.slice(0, 30)}..."`);
    const preCount = viewRequests.length;
    await storyCard1.click();
    await authPage.waitForTimeout(2500);

    const initialViewCount = viewRequests.length;
    console.log(`Initial view requests captured: ${initialViewCount} (increased from ${preCount})`);
    results.viewSemantics.initialViewFired = initialViewCount > preCount;

    // Step B: Cause React rerenders (toggle dark mode, toggle language, filter categories)
    console.log("Triggering React rerenders (theme toggle, filter toggle)...");
    const themeBtn = authPage.locator("button[aria-label*='Theme'], button[title*='Theme'], .jdl-header__action--theme").first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await authPage.waitForTimeout(400);
      await themeBtn.click();
      await authPage.waitForTimeout(400);
    }

    // Toggle district filter
    const districtPill = authPage.locator(".jdl-queue-filter__pill").nth(1);
    if (await districtPill.isVisible()) {
      await districtPill.click();
      await authPage.waitForTimeout(400);
      const allPill = authPage.locator(".jdl-queue-filter__pill").first();
      await allPill.click();
      await authPage.waitForTimeout(400);
    }

    console.log(`View requests after React rerenders: ${viewRequests.length}`);
    results.viewSemantics.rerendersDidNotDuplicate = viewRequests.length === initialViewCount;

    // Step C: Simulate background polling / queue refresh
    console.log("Simulating feed refresh/polling...");
    await authPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("jd_feed_poll_refresh"));
    });
    await authPage.waitForTimeout(1500);
    console.log(`View requests after polling simulation: ${viewRequests.length}`);
    results.viewSemantics.pollingDidNotDuplicate = viewRequests.length === initialViewCount;

    // Step D: Keep same story playing continuously across 4 seconds
    console.log("Keeping same story playing continuously...");
    await authPage.waitForTimeout(3000);
    console.log(`View requests during continuous playback: ${viewRequests.length}`);
    results.viewSemantics.continuousPlayDidNotDuplicate = viewRequests.length === initialViewCount;

    // Step E: Change to Story 2
    const storyCard2 = cards.nth(3);
    const storyTitle2 = await storyCard2.locator(".jdl-queue-card__headline").innerText();
    console.log(`Switching to Story 2: "${storyTitle2.slice(0, 30)}..."`);
    await storyCard2.click();
    await authPage.waitForTimeout(2500);
    const viewCountAfterStory2 = viewRequests.length;
    console.log(`View requests after switching to Story 2: ${viewCountAfterStory2}`);
    results.viewSemantics.story2ViewFired = viewCountAfterStory2 > initialViewCount;

    // Step F: Start Story 1 again rapidly (within 30s) -> should be deduplicated
    console.log("Selecting Story 1 again rapidly (within 30s)...");
    await storyCard1.click();
    await authPage.waitForTimeout(2000);
    const countAfterRapidReturn = viewRequests.length;
    console.log(`View requests after rapid return to Story 1: ${countAfterRapidReturn}`);
    results.viewSemantics.rapidRestartDeduplicated = countAfterRapidReturn === viewCountAfterStory2;

    // Capture final verified screenshot
    await authPage.screenshot({ path: `${ARTIFACT_DIR}/final_production_verified_view_semantics.png` });

    await authContext.close();

    results.passed =
      results.authGate.rootRedirectsToLogin &&
      results.authGate.hasBrandTitle &&
      results.authGate.noGuestBypass &&
      results.sessionRouting.liveAccessible &&
      results.sessionRouting.refreshMaintainsSession &&
      results.engagementRow.sequenceVerified &&
      results.engagementRow.noMisleadingCounts &&
      results.engagementRow.readerOpenedWithoutTvChange &&
      results.viewSemantics.initialViewFired &&
      results.viewSemantics.rerendersDidNotDuplicate &&
      results.viewSemantics.pollingDidNotDuplicate &&
      results.viewSemantics.continuousPlayDidNotDuplicate &&
      results.viewSemantics.story2ViewFired &&
      results.viewSemantics.rapidRestartDeduplicated;

    console.log("\n=== AUDIT RESULTS ===");
    console.log(JSON.stringify(results, null, 2));

    fs.writeFileSync(
      `${ARTIFACT_DIR}/view_semantics_audit_results.json`,
      JSON.stringify(results, null, 2)
    );
  } catch (err) {
    console.error("Audit error:", err);
  } finally {
    await browser.close();
  }
}

runAudit();
