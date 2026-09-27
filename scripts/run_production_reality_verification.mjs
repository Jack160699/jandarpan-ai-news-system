import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\shriyansh chandrakar\\.gemini\\antigravity-ide\\brain\\030cd03b-74e5-4148-9230-61309a430039";
const LIVE_URL = "https://www.jandarpan.news/";

const isDeva = (s) => /[\u0900-\u097F]/.test(s || "");
const isLatin = (s) => /[A-Za-z]/.test(s || "");

async function runRealityVerification() {
  console.log("==================================================================");
  console.log("JAN DARPAN — FINAL PRODUCTION REALITY VERIFICATION SUITE");
  console.log("Target Live URL:", LIVE_URL);
  console.log("Timestamp:", new Date().toISOString());
  console.log("==================================================================");

  const results = {
    metadata: {
      url: LIVE_URL,
      testedAt: new Date().toISOString(),
      browser: "Google Chrome (Headless)",
    },
    scenarios: {},
    districtTests: {},
    categoryTests: {},
    contrastAudit: {},
    readerBilingualAudit: {},
    wholeCardPlaybackAudit: {},
    assertions: [],
  };

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });

  // ------------------------------------------------------------------
  // 1. DESKTOP SUITE (1280 x 800)
  // ------------------------------------------------------------------
  console.log("\n[PHASE 1] Initializing Desktop Browser Context (1280x800)...");
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await desktopCtx.newPage();

  console.log("Navigating to live production site...");
  await page.goto(LIVE_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2500);

  // Capture Screenshot 1: Desktop Live Hindi
  const ss1 = path.join(ARTIFACT_DIR, "prod_real_01_desktop_live_hindi.png");
  await page.screenshot({ path: ss1, fullPage: false });
  console.log("✓ Saved Screenshot 1:", ss1);

  // Collect Hindi Live Screen Data
  const hiTvBadge = (await page.locator(".jdl-tv__lt-badge").first().textContent() || "").trim();
  const hiTvScript = (await page.locator(".jdl-tv__lt-headline").first().textContent() || "").trim();
  const hiCardCount = await page.locator("article.jdl-queue-card").count();
  const hiFirstCardHeadline = (await page.locator("article.jdl-queue-card .jdl-queue-card__headline").first().textContent() || "").trim();
  const hiFirstCardDistrict = (await page.locator("article.jdl-queue-card .jdl-queue-card__tag").first().textContent() || "").trim();
  const hiFirstCardImage = await page.locator("article.jdl-queue-card img.jdl-mobile-queue__thumb").first().getAttribute("src");

  console.log("\n[Desktop Hindi State]:");
  console.log("  TV Badge:", hiTvBadge);
  console.log("  TV Script Snippet:", hiTvScript.slice(0, 60));
  console.log("  Cards Rendered:", hiCardCount);
  console.log("  Card #1 District:", hiFirstCardDistrict);
  console.log("  Card #1 Headline:", hiFirstCardHeadline);
  console.log("  Card #1 Image URL:", hiFirstCardImage?.slice(0, 70));

  results.scenarios.desktopLiveHindi = {
    tvBadge: hiTvBadge,
    tvScript: hiTvScript.slice(0, 100),
    cardCount: hiCardCount,
    card1Headline: hiFirstCardHeadline,
    card1District: hiFirstCardDistrict,
    card1Image: hiFirstCardImage,
    isHindiBadge: hiTvBadge.includes("मुख्य खबर"),
    isHindiHeadline: isDeva(hiFirstCardHeadline),
  };

  // ------------------------------------------------------------------
  // 2. SWITCH TO ENGLISH IN-PLACE (NO PAGE RELOAD)
  // ------------------------------------------------------------------
  console.log("\n[PHASE 2] Switching Language to English via Masthead...");
  const enBtn = page.locator(".jd-mobile-lang button:has-text('EN'), button:has-text('EN')").first();
  await enBtn.click();
  await page.waitForTimeout(3000);

  // Capture Screenshot 2: Desktop Live English
  const ss2 = path.join(ARTIFACT_DIR, "prod_real_02_desktop_live_english.png");
  await page.screenshot({ path: ss2, fullPage: false });
  console.log("✓ Saved Screenshot 2:", ss2);

  const enTvBadge = (await page.locator(".jdl-tv__lt-badge").first().textContent() || "").trim();
  const enTvScript = (await page.locator(".jdl-tv__lt-headline").first().textContent() || "").trim();
  const enCardCount = await page.locator("article.jdl-queue-card").count();
  const enFirstCardHeadline = (await page.locator("article.jdl-queue-card .jdl-queue-card__headline").first().textContent() || "").trim();
  const enFirstCardDistrict = (await page.locator("article.jdl-queue-card .jdl-queue-card__tag").first().textContent() || "").trim();
  const enFirstCardImage = await page.locator("article.jdl-queue-card img.jdl-mobile-queue__thumb").first().getAttribute("src");

  console.log("\n[Desktop English State]:");
  console.log("  TV Badge:", enTvBadge);
  console.log("  TV Script Snippet:", enTvScript.slice(0, 60));
  console.log("  Cards Rendered:", enCardCount);
  console.log("  Card #1 District:", enFirstCardDistrict);
  console.log("  Card #1 Headline:", enFirstCardHeadline);
  console.log("  Card #1 Image URL:", enFirstCardImage?.slice(0, 70));

  results.scenarios.desktopLiveEnglish = {
    tvBadge: enTvBadge,
    tvScript: enTvScript.slice(0, 100),
    cardCount: enCardCount,
    card1Headline: enFirstCardHeadline,
    card1District: enFirstCardDistrict,
    card1Image: enFirstCardImage,
    isEnglishBadge: enTvBadge.includes("TOP STORY"),
    hasDevaInHeadline: isDeva(enFirstCardHeadline),
    hasDevaInDistrict: isDeva(enFirstCardDistrict),
    hasDevaInScript: isDeva(enTvScript),
  };

  // ------------------------------------------------------------------
  // 3. WHOLE-CARD PLAYBACK TEST
  // ------------------------------------------------------------------
  console.log("\n[PHASE 3] Testing Whole-Card Click vs 'Read' Button...");
  const card2 = page.locator("article.jdl-queue-card").nth(1);
  const card2Headline = (await card2.locator(".jdl-queue-card__headline").textContent() || "").trim();

  // Clicking the headline inside Card #2 must play story #2 on TV
  console.log(`Clicking headline of Card #2: "${card2Headline.slice(0, 45)}"`);
  await card2.locator(".jdl-queue-card__headline").click();
  await page.waitForTimeout(1500);

  const activeTvScriptAfterClick = (await page.locator(".jdl-tv__lt-headline").first().textContent() || "").trim();
  const readerOpenAfterCardClick = (await page.locator("article.jd-open-reader").count()) > 0;

  console.log("  Active TV Lower-Third Script:", activeTvScriptAfterClick.slice(0, 60));
  console.log("  Reader Open? (Must be FALSE):", readerOpenAfterCardClick);

  results.wholeCardPlaybackAudit = {
    card2Headline,
    tvUpdatedToCard2: activeTvScriptAfterClick.toLowerCase().includes(card2Headline.toLowerCase().slice(0, 25)) ||
                      card2Headline.toLowerCase().includes(activeTvScriptAfterClick.toLowerCase().slice(0, 25)),
    readerDidNotPrematurelyOpen: !readerOpenAfterCardClick,
  };

  // ------------------------------------------------------------------
  // 4. OPEN ARTICLE READER SPECIFICALLY VIA "Read" / "पढ़ें" BUTTON
  // ------------------------------------------------------------------
  console.log("\n[PHASE 4] Opening In-Place Article Reader for Card #2 via 'Read' button...");
  const card2ReadBtn = card2.locator("button.jdl-queue-card__read-btn");
  await card2ReadBtn.click();
  await page.waitForTimeout(3000);

  // Capture Screenshot 3: Desktop Reader English
  const ss3 = path.join(ARTIFACT_DIR, "prod_real_03_desktop_reader_english.png");
  await page.screenshot({ path: ss3, fullPage: false });
  console.log("✓ Saved Screenshot 3:", ss3);

  // Verify reader structure: queue disappears, persistent TV stays above
  const isQueueVisibleInReader = (await page.locator(".jdl-broadcast-queue-col").count()) > 0;
  const isTvStickyInReader = (await page.locator(".jdl-broadcast-tv-col--reading").count()) > 0;
  const isDedicatedReaderVisible = (await page.locator("article.jd-open-reader").count()) > 0;

  const readerHeadlineEn = (await page.locator("h1.jd-reader-headline").first().textContent() || "").trim();
  const readerSummaryEn = (await page.locator("p.jd-reader-summary").first().textContent() || "").trim();
  const readerDistrictEn = (await page.locator(".jd-reader-district-pill").first().textContent() || "").trim();
  const readerCategoryEn = (await page.locator(".jd-reader-cat-pill").first().textContent() || "").trim();
  const readerParasEn = await page.locator("p.jd-reader-para").allTextContents();
  const relatedCountEn = await page.locator(".jd-reader-related-list article.jdl-queue-card").count();

  console.log("\n[Desktop Article Reader - English]:");
  console.log("  Queue Hidden:", !isQueueVisibleInReader);
  console.log("  TV Persistent:", isTvStickyInReader);
  console.log("  Reader Headline:", readerHeadlineEn);
  console.log("  Reader Summary:", readerSummaryEn.slice(0, 80));
  console.log("  Reader District Pill:", readerDistrictEn);
  console.log("  Reader Category Pill:", readerCategoryEn);
  console.log("  Paragraphs Count:", readerParasEn.length);
  console.log("  Para 1 Snippet:", (readerParasEn[0] || "").slice(0, 80));
  console.log("  Related Stories Count:", relatedCountEn);

  results.readerBilingualAudit.english = {
    headline: readerHeadlineEn,
    summary: readerSummaryEn,
    district: readerDistrictEn,
    category: readerCategoryEn,
    paragraphCount: readerParasEn.length,
    para1Snippet: (readerParasEn[0] || "").slice(0, 120),
    relatedStoriesCount: relatedCountEn,
    hasDevaInHeadline: isDeva(readerHeadlineEn),
    hasDevaInSummary: isDeva(readerSummaryEn),
    hasDevaInBody: isDeva(readerParasEn.join(" ")),
  };

  // ------------------------------------------------------------------
  // 5. IN-PLACE LANGUAGE SWITCH: ENGLISH → HINDI (READER MUST REMAIN OPEN)
  // ------------------------------------------------------------------
  console.log("\n[PHASE 5] Switching Language to Hindi WHILE Reader is Open...");
  const hiBtn = page.locator(".jd-mobile-lang button:has-text('हिंदी'), button:has-text('हिंदी')").first();
  await hiBtn.click();
  await page.waitForTimeout(3000);

  // Capture Screenshot 4: Desktop Reader Hindi
  const ss4 = path.join(ARTIFACT_DIR, "prod_real_04_desktop_reader_hindi.png");
  await page.screenshot({ path: ss4, fullPage: false });
  console.log("✓ Saved Screenshot 4:", ss4);

  const isDedicatedReaderStillOpen = (await page.locator("article.jd-open-reader").count()) > 0;
  const readerHeadlineHi = (await page.locator("h1.jd-reader-headline").first().textContent() || "").trim();
  const readerSummaryHi = (await page.locator("p.jd-reader-summary").first().textContent() || "").trim();
  const readerDistrictHi = (await page.locator(".jd-reader-district-pill").first().textContent() || "").trim();
  const readerCategoryHi = (await page.locator(".jd-reader-cat-pill").first().textContent() || "").trim();
  const readerParasHi = await page.locator("p.jd-reader-para").allTextContents();
  const relatedCountHi = await page.locator(".jd-reader-related-list article.jdl-queue-card").count();

  console.log("\n[Desktop Article Reader - Hindi]:");
  console.log("  Reader Remained Open:", isDedicatedReaderStillOpen);
  console.log("  Reader Headline:", readerHeadlineHi);
  console.log("  Reader Summary:", readerSummaryHi.slice(0, 80));
  console.log("  Reader District Pill:", readerDistrictHi);
  console.log("  Reader Category Pill:", readerCategoryHi);
  console.log("  Paragraphs Count:", readerParasHi.length);
  console.log("  Para 1 Snippet:", (readerParasHi[0] || "").slice(0, 80));
  console.log("  Related Stories Count:", relatedCountHi);

  results.readerBilingualAudit.hindi = {
    readerRemainedOpen: isDedicatedReaderStillOpen,
    headline: readerHeadlineHi,
    summary: readerSummaryHi,
    district: readerDistrictHi,
    category: readerCategoryHi,
    paragraphCount: readerParasHi.length,
    para1Snippet: (readerParasHi[0] || "").slice(0, 120),
    relatedStoriesCount: relatedCountHi,
    isDevaInHeadline: isDeva(readerHeadlineHi),
    isDevaInSummary: isDeva(readerSummaryHi),
    isDevaInBody: isDeva(readerParasHi.join(" ")),
  };

  // ------------------------------------------------------------------
  // 6. DARK MODE VISUAL & CONTRAST AUDIT (DESKTOP)
  // ------------------------------------------------------------------
  console.log("\n[PHASE 6] Toggling Dark Mode on Desktop Reader...");
  const themeToggle = page.locator(".jd-mobile-theme-toggle").first();
  await themeToggle.click();
  await page.waitForTimeout(1500);

  // Capture Screenshot 5: Desktop Reader Dark
  const ss5 = path.join(ARTIFACT_DIR, "prod_real_05_desktop_reader_dark.png");
  await page.screenshot({ path: ss5, fullPage: false });
  console.log("✓ Saved Screenshot 5:", ss5);

  const headlineColorDark = await page.locator("h1.jd-reader-headline").first().evaluate((el) => {
    return window.getComputedStyle(el).color;
  });
  const bodyColorDark = await page.locator("p.jd-reader-para").first().evaluate((el) => {
    return window.getComputedStyle(el).color;
  });
  const readerBgDark = await page.locator("article.jd-open-reader").first().evaluate((el) => {
    return window.getComputedStyle(el).backgroundColor;
  });

  console.log("  Dark Mode Heading Color:", headlineColorDark);
  console.log("  Dark Mode Body Color:", bodyColorDark);
  console.log("  Dark Mode Reader Background:", readerBgDark);

  results.contrastAudit.desktopDark = {
    headlineColor: headlineColorDark,
    bodyColor: bodyColorDark,
    readerBg: readerBgDark,
  };

  // ------------------------------------------------------------------
  // 7. RETURN TO LIVE QUEUE & TEST CATEGORY FILTERING
  // ------------------------------------------------------------------
  console.log("\n[PHASE 7] Returning to Live Queue via 'Back' Button...");
  const backBtn = page.locator("button.jd-control-btn--back, button:has-text('वापस जाएं')").first();
  await backBtn.click();
  await page.waitForTimeout(2000);

  // Category Filtering Test
  console.log("Testing Category Filters in Hindi...");
  const categoriesToTest = [
    { name: "क्राइम", screenshot: "prod_real_06_desktop_category_crime.png", key: "crime" },
    { name: "राजनीति", screenshot: "prod_real_07_desktop_category_politics.png", key: "politics" },
  ];

  for (const cat of categoriesToTest) {
    console.log(`Filtering by category: "${cat.name}"...`);
    const tab = page.locator(`.jdl-category-tab:has-text('${cat.name}')`).first();
    if (await tab.isVisible()) {
      await tab.click();
      await page.waitForTimeout(1500);
      const catSs = path.join(ARTIFACT_DIR, cat.screenshot);
      await page.screenshot({ path: catSs, fullPage: false });
      console.log(`✓ Saved Category Screenshot:`, catSs);

      const catCardCount = await page.locator("article.jdl-queue-card").count();
      const firstHeadline = (await page.locator("article.jdl-queue-card .jdl-queue-card__headline").first().textContent() || "").trim();
      const firstDistrict = (await page.locator("article.jdl-queue-card .jdl-queue-card__tag").first().textContent() || "").trim();

      results.categoryTests[cat.key] = {
        name: cat.name,
        cardCount: catCardCount,
        firstHeadline,
        firstDistrict,
      };
      console.log(`  Filtered (${cat.name}): ${catCardCount} cards | #1: "${firstHeadline.slice(0, 45)}"`);
    }
  }

  // Reset to "सभी"
  const allTab = page.locator(`.jdl-category-tab:has-text('सभी')`).first();
  if (await allTab.isVisible()) {
    await allTab.click();
    await page.waitForTimeout(1000);
  }

  // ------------------------------------------------------------------
  // 8. TEST DISTRICT QUICK SWITCHING (Durg, Raipur, Bilaspur, Rajnandgaon)
  // ------------------------------------------------------------------
  console.log("\n[PHASE 8] Testing District Priority (Durg, Raipur, Bilaspur, Rajnandgaon)...");
  const districtsToTest = [
    { slug: "durg", nameHi: "दुर्ग", nameEn: "Durg" },
    { slug: "raipur", nameHi: "रायपुर", nameEn: "Raipur" },
    { slug: "bilaspur", nameHi: "बिलासपुर", nameEn: "Bilaspur" },
    { slug: "rajnandgaon", nameHi: "राजनांदगाँव", nameEn: "Rajnandgaon" },
  ];

  for (const dist of districtsToTest) {
    console.log(`Selecting District: ${dist.nameHi} (${dist.slug})...`);
    const districtTrigger = page.locator("[data-testid='district-selector-trigger']").first();
    if (await districtTrigger.isVisible()) {
      await districtTrigger.click();
      await page.waitForTimeout(800);

      // Find button in dialog matching district name or prefix
      const dialog = page.locator("[data-testid='jd-district-picker-dialog']");
      const distBtn = dialog.locator("button").filter({ hasText: dist.nameHi.slice(0, 4) }).first();
      if (await distBtn.isVisible()) {
        await distBtn.click();
        await page.waitForTimeout(2000);

        const firstCardDist = (await page.locator("article.jdl-queue-card .jdl-queue-card__tag").first().textContent() || "").trim();
        const firstCardHead = (await page.locator("article.jdl-queue-card .jdl-queue-card__headline").first().textContent() || "").trim();

        results.districtTests[dist.slug] = {
          expectedSlug: dist.slug,
          firstCardTag: firstCardDist,
          firstCardHeadline: firstCardHead,
          isDistrictPrioritized: firstCardDist.toLowerCase().includes(dist.nameHi.slice(0, 4).toLowerCase()) ||
                                 firstCardHead.toLowerCase().includes(dist.nameHi.slice(0, 4).toLowerCase()) ||
                                 firstCardHead.toLowerCase().includes(dist.nameEn.toLowerCase()),
        };
        console.log(`  Result for ${dist.nameHi}: Top Story Tag = "${firstCardDist}", Headline = "${firstCardHead.slice(0, 45)}"`);

        if (dist.slug === "durg") {
          const ssDurg = path.join(ARTIFACT_DIR, "prod_real_08_desktop_district_durg.png");
          await page.screenshot({ path: ssDurg, fullPage: false });
          console.log("✓ Saved Durg District Screenshot:", ssDurg);
        }
      } else {
        console.warn(`District button for ${dist.nameHi} not visible in dialog.`);
        // Close dialog if open
        const closeX = dialog.locator("button").first();
        if (await closeX.isVisible()) await closeX.click();
      }
    }
  }

  // Ensure district dialog is closed
  const remainingDialog = page.locator("[data-testid='jd-district-picker-dialog']");
  if (await remainingDialog.isVisible()) {
    const closeX = remainingDialog.locator("button").first();
    await closeX.click();
    await page.waitForTimeout(500);
  }

  // Restore theme to light if needed
  try {
    const isDarkNow = await page.evaluate(() => document.documentElement.classList.contains("dark") || document.body.classList.contains("dark"));
    if (isDarkNow) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }
  } catch {}

  await desktopCtx.close();

  // ------------------------------------------------------------------
  // 9. MOBILE REALITY AUDIT (390 x 844 iPhone 14)
  // ------------------------------------------------------------------
  console.log("\n[PHASE 9] Initializing Mobile Browser Context (390x844 iPhone 14)...");
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  });
  const mPage = await mobileCtx.newPage();

  console.log("Navigating to live production site on Mobile...");
  await mPage.goto(LIVE_URL, { waitUntil: "networkidle", timeout: 45000 });
  await mPage.waitForTimeout(2500);

  // Capture Screenshot 9: Mobile Live Hindi
  const ss9 = path.join(ARTIFACT_DIR, "prod_real_09_mobile_live_hindi.png");
  await mPage.screenshot({ path: ss9, fullPage: false });
  console.log("✓ Saved Screenshot 9:", ss9);

  // Switch to English on Mobile
  console.log("Switching to English on Mobile...");
  const mEnBtn = mPage.locator(".jd-mobile-lang button:has-text('EN'), button:has-text('EN')").first();
  await mEnBtn.click();
  await mPage.waitForTimeout(3000);

  // Capture Screenshot 10: Mobile Live English
  const ss10 = path.join(ARTIFACT_DIR, "prod_real_10_mobile_live_english.png");
  await mPage.screenshot({ path: ss10, fullPage: false });
  console.log("✓ Saved Screenshot 10:", ss10);

  // Open Article Reader on Mobile
  console.log("Opening Article Reader on Mobile...");
  const mReadBtn = mPage.locator("article.jdl-queue-card button.jdl-queue-card__read-btn").first();
  await mReadBtn.click();
  await mPage.waitForTimeout(3000);

  // Capture Screenshot 11: Mobile Reader English
  const ss11 = path.join(ARTIFACT_DIR, "prod_real_11_mobile_reader_english.png");
  await mPage.screenshot({ path: ss11, fullPage: false });
  console.log("✓ Saved Screenshot 11:", ss11);

  // Toggle Dark Mode on Mobile
  console.log("Toggling Dark Mode on Mobile...");
  const mThemeToggle = mPage.locator(".jd-mobile-theme-toggle").first();
  await mThemeToggle.click();
  await mPage.waitForTimeout(1500);

  // Capture Screenshot 12: Mobile Reader Dark
  const ss12 = path.join(ARTIFACT_DIR, "prod_real_12_mobile_reader_dark.png");
  await mPage.screenshot({ path: ss12, fullPage: false });
  console.log("✓ Saved Screenshot 12:", ss12);

  // Switch to Hindi on Mobile in Dark Mode
  console.log("Switching to Hindi in Mobile Dark Reader...");
  const mHiBtn = mPage.locator(".jd-mobile-lang button:has-text('हिंदी'), button:has-text('हिंदी')").first();
  await mHiBtn.click();
  await mPage.waitForTimeout(3000);

  // Capture Screenshot 13: Mobile Reader Hindi Dark
  const ss13 = path.join(ARTIFACT_DIR, "prod_real_13_mobile_reader_hindi_dark.png");
  await mPage.screenshot({ path: ss13, fullPage: false });
  console.log("✓ Saved Screenshot 13:", ss13);

  const mReaderHeadlineHi = (await mPage.locator("h1.jd-reader-headline").first().textContent() || "").trim();
  const mReaderBodyHi = (await mPage.locator("p.jd-reader-para").first().textContent() || "").trim();

  results.scenarios.mobileReader = {
    headlineHi: mReaderHeadlineHi,
    bodySnippetHi: mReaderBodyHi.slice(0, 100),
    isDevaHeadline: isDeva(mReaderHeadlineHi),
    isDevaBody: isDeva(mReaderBodyHi),
  };

  await mobileCtx.close();
  await browser.close();

  const outPath = "scripts/final_production_reality_verification_results.json";
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n==================================================================`);
  console.log(`✓ PRODUCTION REALITY AUDIT COMPLETED SUCCESSFULLY!`);
  console.log(`✓ Results saved to ${outPath}`);
  console.log(`==================================================================`);
}

runRealityVerification().catch((err) => {
  console.error("FATAL ERROR in Reality Verification Suite:", err);
  process.exit(1);
});
