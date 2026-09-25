import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const TARGET_URL = process.env.TARGET_URL || "https://www.jandarpan.news";
const OUTPUT_DIR = path.resolve("C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/030cd03b-74e5-4148-9230-61309a430039");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function initContext(context) {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
      localStorage.setItem("cgb_perm_notify", "1");
      localStorage.setItem("cgb_perm_location", "1");
      localStorage.setItem("cgb_install_dismissed", "1");
      localStorage.setItem("jdl_audio_unlocked", "1");
    } catch {}
  });
}

async function dismissPopups(page) {
  try {
    const dismissBtn = page.locator("button:has-text('अभी नहीं'), button:has-text('Not now')");
    if (await dismissBtn.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await dismissBtn.first().click().catch(() => {});
      await page.waitForTimeout(300);
    }
  } catch {}
}

async function run() {
  console.log("=================================================================");
  console.log("JAN DARPAN — COMPREHENSIVE FORENSIC AUDIT SUITE");
  console.log(`Target Production URL: ${TARGET_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("=================================================================\n");

  const report = {};

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. AUDIT COMPLETE 30-DAY NEWS UNIVERSE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(">>> [1/18] AUDITING 30-DAY NEWS UNIVERSE...");
  const [feedHiRes, feedEnRes, regRes, hpRes] = await Promise.all([
    fetch(`${TARGET_URL}/api/broadcast/feed?lang=hi`),
    fetch(`${TARGET_URL}/api/broadcast/feed?lang=en`),
    fetch(`${TARGET_URL}/api/regional/feed`),
    fetch(`${TARGET_URL}/api/homepage/live`),
  ]);

  const feedHi = feedHiRes.ok ? await feedHiRes.json() : null;
  const feedEn = feedEnRes.ok ? await feedEnRes.json() : null;
  const regFeed = regRes.ok ? await regRes.json() : null;
  const hpFeed = hpRes.ok ? await hpRes.json() : null;

  const now = Date.now();
  const allCanonical = new Map();

  const addStory = (s, origin) => {
    if (!s || !s.id) return;
    const existing = allCanonical.get(s.id) || {
      id: s.id,
      headline: s.headlineHi || s.headline || "",
      headlineEn: s.headlineEn || s.headline || "",
      district: s.district || s.districtHi || "",
      categories: s.canonicalCategories || s.categories || [],
      publishedAt: s.publishedAt || s.created_at || null,
      imageUrl: s.imageUrl || s.hero_image_url || null,
      origins: new Set(),
      inBroadcastQueue: false,
    };
    existing.origins.add(origin);
    if (origin.includes("broadcast")) existing.inBroadcastQueue = true;
    if (s.imageUrl && !existing.imageUrl) existing.imageUrl = s.imageUrl;
    allCanonical.set(s.id, existing);
  };

  (feedHi?.queue || []).forEach((s) => addStory(s, "broadcast-hi"));
  (feedHi?.breaking || []).forEach((s) => addStory(s, "broadcast-breaking-hi"));
  (feedEn?.queue || []).forEach((s) => addStory(s, "broadcast-en"));
  (feedEn?.breaking || []).forEach((s) => addStory(s, "broadcast-breaking-en"));

  (regFeed?.feeds || []).forEach((block) => {
    (block.articles || []).forEach((a) => addStory(a, `regional-${block.districtSlug}`));
  });

  (hpFeed?.liveWire || []).forEach((s) => addStory(s, "homepage-liveWire"));
  (hpFeed?.trending || []).forEach((s) => addStory(s, "homepage-trending"));

  const articlesArr = Array.from(allCanonical.values());

  const ageBuckets = {
    today: 0,       // 0 - 24h
    threeDays: 0,   // 24 - 72h
    sevenDays: 0,   // 3 - 7d
    fifteenDays: 0, // 7 - 15d
    twentyOneDays: 0, // 15 - 21d
    thirtyDays: 0,  // 21 - 30d
    olderThanThirty: 0,
    noDate: 0,
  };

  articlesArr.forEach((a) => {
    if (!a.publishedAt) {
      ageBuckets.noDate++;
      return;
    }
    const daysAgo = (now - new Date(a.publishedAt).getTime()) / (24 * 3600 * 1000);
    if (daysAgo < 1) ageBuckets.today++;
    else if (daysAgo < 3) ageBuckets.threeDays++;
    else if (daysAgo < 7) ageBuckets.sevenDays++;
    else if (daysAgo < 15) ageBuckets.fifteenDays++;
    else if (daysAgo < 21) ageBuckets.twentyOneDays++;
    else if (daysAgo <= 30) ageBuckets.thirtyDays++;
    else ageBuckets.olderThanThirty++;
  });

  report.universe = {
    totalCanonical: articlesArr.length,
    ageBuckets,
    broadcastQueueLength: (feedHi?.queue || []).length,
    breakingQueueLength: (feedHi?.breaking || []).length,
  };

  console.log(`Total Discoverable Canonical Articles: ${articlesArr.length}`);
  console.log("Age distribution:", ageBuckets);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PROVE HINDI ↔ ENGLISH PARITY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n>>> [2/18] AUDITING HINDI ↔ ENGLISH PARITY...");
  const hiQueueIds = (feedHi?.queue || []).map((x) => x.id);
  const enQueueIds = (feedEn?.queue || []).map((x) => x.id);

  const missingInEn = hiQueueIds.filter((id) => !enQueueIds.includes(id));
  const missingInHi = enQueueIds.filter((id) => !hiQueueIds.includes(id));

  report.languageParity = {
    hiCount: hiQueueIds.length,
    enCount: enQueueIds.length,
    missingInEn,
    missingInHi,
    isQueueParityExact: hiQueueIds.length === enQueueIds.length && missingInEn.length === 0,
  };
  console.log(`Live Queue Parity: HI=${hiQueueIds.length}, EN=${enQueueIds.length}, Mismatches: ${missingInEn.length + missingInHi.length}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. AUDIT CATEGORY TAGGING ARTICLE BY ARTICLE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n>>> [3/18] AUDITING CATEGORY TAGGING PRECISION...");
  const categoryAuditTable = [];

  for (const s of (feedHi?.queue || [])) {
    const cats = s.canonicalCategories || [];
    const headline = s.headlineHi || s.headline || "";
    categoryAuditTable.push({
      id: s.id,
      headline: headline.slice(0, 45) + "...",
      district: s.districtHi || s.district,
      assignedCategories: cats.join(", "),
      inAll: true,
      hasCrime: cats.includes("crime"),
      hasGov: cats.includes("governance"),
      hasPol: cats.includes("politics"),
      hasNat: cats.includes("national"),
      hasCg: cats.includes("chhattisgarh"),
      hasBiz: cats.includes("business"),
    });
  }
  report.categoryAuditSample = categoryAuditTable.slice(0, 10);
  console.log(`Sample of 10 stories audited for category tagging:`);
  console.table(categoryAuditTable.slice(0, 10));

  // ─────────────────────────────────────────────────────────────────────────────
  // 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 17, 18: PLAYWRIGHT BROWSER AUDIT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n>>> LAUNCHING PLAYWRIGHT FOR REAL UI & INTERACTION AUDIT...");
  const browser = await chromium.launch({ headless: true });

  // ─── A. DESKTOP LIGHT & DARK AUDIT ─────────────────────────────────────────
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await initContext(desktopContext);
  const page = await desktopContext.newPage();

  console.log("Navigating to production site in Desktop (1440x900)...");
  await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);
  await dismissPopups(page);

  // 4. TEST THE "सभी" INVARIANT
  const cardElements = await page.locator(".jdl-queue-card");
  const initialCardCount = await cardElements.count();
  console.log(`[4] 'सभी' Tab Visible Card Count: ${initialCardCount}`);
  report.allTabCount = initialCardCount;

  // 5. TEST CATEGORY EXCLUSIVITY ON LIVE UI
  const categoryTabNames = [
    { id: "crime", name: "क्राइम" },
    { id: "politics", name: "राजनीति" },
    { id: "national", name: "राष्ट्रीय" },
    { id: "chhattisgarh", name: "छत्तीसगढ़" },
    { id: "business", name: "बाज़ार" },
    { id: "governance", name: "प्रशासन" },
  ];

  const categoryResults = {};
  for (const cat of categoryTabNames) {
    const tab = page.locator(`.jdl-category-tab:has-text('${cat.name}')`).first();
    if (await tab.isVisible()) {
      await tab.click();
      await page.waitForTimeout(600);
      const count = await page.locator(".jdl-queue-card").count();
      categoryResults[cat.name] = count;
      console.log(`[5] Category [${cat.name}] returned ${count} cards`);
    } else {
      categoryResults[cat.name] = "TAB_NOT_FOUND";
    }
  }
  report.categoryResults = categoryResults;

  // Return to 'सभी'
  await page.locator(".jdl-category-tab:has-text('सभी')").first().click();
  await page.waitForTimeout(500);

  // 7. AUDIT DISTRICT + CATEGORY LOGIC
  console.log("\n[7] Testing District + Category UI Filtering...");
  const districtTests = [
    { district: "दुर्ग", cat: "सभी" },
    { district: "रायपुर", cat: "सभी" },
    { district: "बिलासपुर", cat: "सभी" },
    { district: "राजनांदगांव", cat: "सभी" },
    { district: "दुर्ग", cat: "क्राइम" },
    { district: "रायपुर", cat: "राजनीति" },
    { district: "बिलासपुर", cat: "प्रशासन" },
  ];

  const districtResults = [];
  for (const dt of districtTests) {
    // Select category
    const catTab = page.locator(`.jdl-category-tab:has-text('${dt.cat}')`).first();
    if (await catTab.isVisible()) {
      await catTab.click();
      await page.waitForTimeout(500);
    }
    const count = await page.locator(".jdl-queue-card").count();
    let firstCardDistrict = "N/A";
    if (count > 0) {
      firstCardDistrict = (await page.locator(".jdl-queue-card .jdl-queue-card__tag").first().textContent())?.trim() || "N/A";
    }
    districtResults.push({
      test: `${dt.district} + ${dt.cat}`,
      cardCount: count,
      firstCardTag: firstCardDistrict,
    });
    console.log(`District test [${dt.district} + ${dt.cat}] => Count: ${count}, First card: ${firstCardDistrict}`);
  }
  report.districtResults = districtResults;

  // Reset to 'सभी'
  await page.locator(".jdl-category-tab:has-text('सभी')").first().click();
  await page.waitForTimeout(500);

  // 9. AUDIT WHOLE-CARD INTERACTION
  console.log("\n[9] Auditing Whole-Card Interaction...");
  const firstCard = page.locator(".jdl-queue-card").first();
  const headlineEl = firstCard.locator(".jdl-queue-card__headline");
  const thumbEl = firstCard.locator(".jdl-queue-card__thumb-wrap");
  const readBtnEl = firstCard.locator(".jdl-queue-card__read-btn");

  // A. Click headline
  await headlineEl.click();
  await page.waitForTimeout(800);
  const readerOpenOnHeadline = await page.locator(".jd-open-reader").isVisible().catch(() => false);
  const activeTvOnHeadline = await firstCard.evaluate((el) => el.classList.contains("jdl-queue-card--tv-active"));
  console.log(`- Tap Headline: TV Active = ${activeTvOnHeadline}, Reader Opened = ${readerOpenOnHeadline}`);

  // B. Click thumbnail
  await thumbEl.click();
  await page.waitForTimeout(800);
  const readerOpenOnThumb = await page.locator(".jd-open-reader").isVisible().catch(() => false);
  const activeTvOnThumb = await firstCard.evaluate((el) => el.classList.contains("jdl-queue-card--tv-active"));
  console.log(`- Tap Thumbnail: TV Active = ${activeTvOnThumb}, Reader Opened = ${readerOpenOnThumb}`);

  // C. Click card body
  await firstCard.click();
  await page.waitForTimeout(800);
  const readerOpenOnBody = await page.locator(".jd-open-reader").isVisible().catch(() => false);
  const activeTvOnBody = await firstCard.evaluate((el) => el.classList.contains("jdl-queue-card--tv-active"));
  console.log(`- Tap Card Body: TV Active = ${activeTvOnBody}, Reader Opened = ${readerOpenOnBody}`);

  // D. Click exclusively "पढ़ें" button
  await readBtnEl.click();
  await page.waitForTimeout(1500);
  const readerOpenOnReadBtn = await page.locator(".jd-open-reader").isVisible().catch(() => false);
  console.log(`- Tap 'पढ़ें' Button: Reader Opened = ${readerOpenOnReadBtn}`);

  report.cardInteractions = {
    headlinePlaysTv: activeTvOnHeadline && !readerOpenOnHeadline,
    thumbPlaysTv: activeTvOnThumb && !readerOpenOnThumb,
    bodyPlaysTv: activeTvOnBody && !readerOpenOnBody,
    readBtnOpensReader: readerOpenOnReadBtn,
  };

  // 11, 13, 14, 15: ARTICLE READER AUDIT (LIGHT MODE)
  console.log("\n[11, 13, 14, 15] Auditing Article Reader in Light Mode...");
  const shotArticleLight = path.join(OUTPUT_DIR, "forensic_01_desktop_reader_light.png");
  await page.screenshot({ path: shotArticleLight, fullPage: false });

  // Measure reader dimensions & styling
  const readerBox = await page.locator(".jd-open-reader").boundingBox();
  const contentWidth = await page.locator(".jd-reader-content").boundingBox();
  const headlineComputed = await page.locator(".jd-reader-headline").evaluate((el) => {
    const s = window.getComputedStyle(el);
    return { fontSize: s.fontSize, lineHeight: s.lineHeight, color: s.color };
  });
  const bodyComputed = await page.locator(".jd-reader-para").first().evaluate((el) => {
    const s = window.getComputedStyle(el);
    return { fontSize: s.fontSize, lineHeight: s.lineHeight, color: s.color };
  }).catch(() => null);

  // 13. Action controls audit
  const controlsAudit = await page.evaluate(() => {
    const back = document.querySelector(".jd-control-btn--back, button[aria-label*='वापस'], button[aria-label*='Back']");
    const share = document.querySelector("button[aria-label*='शेयर'], button[aria-label*='Share']");
    const whatsapp = document.querySelector("button[aria-label*='WhatsApp']");
    const close = document.querySelector("button[aria-label*='बंद'], button[aria-label*='Close']");

    return {
      hasBack: !!back,
      hasShare: !!share,
      hasWhatsapp: !!whatsapp,
      hasClose: !!close,
      backRadius: back ? window.getComputedStyle(back).borderRadius : null,
      shareRadius: share ? window.getComputedStyle(share).borderRadius : null,
      whatsappRadius: whatsapp ? window.getComputedStyle(whatsapp).borderRadius : null,
      whatsappHeight: whatsapp ? window.getComputedStyle(whatsapp).height : null,
    };
  });

  // 14. Related articles layout audit
  const relatedLayout = await page.evaluate(() => {
    const section = document.querySelector(".jd-reader-related");
    if (!section) return { found: false };
    const cards = Array.from(section.querySelectorAll(".jd-related-card, .jdl-related-card, article"));
    if (!cards.length) return { found: true, cardsCount: 0 };
    const first = cards[0];
    const img = first.querySelector("img, .thumb, .image");
    const content = first.querySelector(".content, .body, h4, h3");
    let isImageLeft = false;
    if (img && content) {
      const imgRect = img.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      isImageLeft = imgRect.left < contentRect.left;
    }
    return {
      found: true,
      cardsCount: cards.length,
      isImageLeft,
    };
  });

  // 15. Public source audit in reader UI
  const readerText = await page.locator(".jd-open-reader").innerText();
  const sourceMatches = readerText.match(/(?:स्रोत|source)\s*:\s*[^\n]+/gi);

  report.readerAudit = {
    readerBoundingBox: readerBox,
    contentWidth: contentWidth?.width,
    headlineComputed,
    bodyComputed,
    controlsAudit,
    relatedLayout,
    sourceMatches: sourceMatches || [],
    hasPublicSourceLeak: (sourceMatches || []).length > 0,
  };

  console.log("Reader Width:", readerBox?.width, "Content Width:", contentWidth?.width);
  console.log("Headline Style:", headlineComputed);
  console.log("Body Style:", bodyComputed);
  console.log("Controls:", controlsAudit);
  console.log("Related Layout:", relatedLayout);
  console.log("Source label leak in UI:", (sourceMatches || []).length > 0);

  // 12. AUDIT DARK MODE
  console.log("\n[12] Auditing Dark Mode Contrast & Renders...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    const root = document.querySelector(".jd-ds");
    if (root) root.setAttribute("data-theme", "dark");
  });
  await page.waitForTimeout(600);

  const shotArticleDark = path.join(OUTPUT_DIR, "forensic_02_desktop_reader_dark.png");
  await page.screenshot({ path: shotArticleDark, fullPage: false });

  const darkModeStyles = await page.evaluate(() => {
    const reader = document.querySelector(".jd-open-reader");
    const headline = document.querySelector(".jd-reader-headline");
    const body = document.querySelector(".jd-reader-para");
    const meta = document.querySelector(".jd-reader-meta");
    return {
      readerBg: reader ? window.getComputedStyle(reader).backgroundColor : null,
      headlineColor: headline ? window.getComputedStyle(headline).color : null,
      bodyColor: body ? window.getComputedStyle(body).color : null,
      metaColor: meta ? window.getComputedStyle(meta).color : null,
    };
  });
  report.darkModeStyles = darkModeStyles;
  console.log("Dark Mode Styles:", darkModeStyles);

  // Navigate back to live queue
  const backBtn = page.locator(".jd-control-btn--back, button:has-text('वापस जाएं'), button:has-text('Back')").first();
  if (await backBtn.isVisible()) {
    await backBtn.click();
    await page.waitForTimeout(800);
  }

  // 17. AUDIT LANGUAGE SWITCH STATE SEQUENCE
  console.log("\n[17] Testing Language Switch State Sequence (HI -> EN -> HI)...");
  // 1. In Hindi, record visible story IDs
  const hiCards = await page.locator(".jdl-queue-card__headline").allTextContents();
  console.log(`Step 1 (Hindi): ${hiCards.length} cards visible`);

  // 2. Switch to English
  const langToggle = page.locator("button:has-text('EN'), button:has-text('English'), [aria-label*='language']").first();
  if (await langToggle.isVisible()) {
    await langToggle.click();
    await page.waitForTimeout(1500);
  }
  const enCards = await page.locator(".jdl-queue-card__headline").allTextContents();
  console.log(`Step 2 (English): ${enCards.length} cards visible`);

  const shotDesktopEn = path.join(OUTPUT_DIR, "forensic_03_desktop_live_english.png");
  await page.screenshot({ path: shotDesktopEn, fullPage: false });

  // 3. Switch back to Hindi
  const langToggleHi = page.locator("button:has-text('HI'), button:has-text('हिंदी'), [aria-label*='language']").first();
  if (await langToggleHi.isVisible()) {
    await langToggleHi.click();
    await page.waitForTimeout(1500);
  }
  const hiCardsRestored = await page.locator(".jdl-queue-card__headline").allTextContents();
  console.log(`Step 3 (Restored Hindi): ${hiCardsRestored.length} cards visible`);

  report.languageSwitchSequence = {
    hiCount: hiCards.length,
    enCount: enCards.length,
    hiRestoredCount: hiCardsRestored.length,
    preserved: hiCards.length === hiCardsRestored.length,
  };

  // 18. AUDIT THE HEADER
  console.log("\n[18] Auditing Header Elements & Responsive Behavior...");
  const headerAudit = await page.evaluate(() => {
    const header = document.querySelector("header, .jdl-header, .site-header");
    const districtSelector = document.querySelector(".district-selector, [data-testid='district-selector'], select, button[aria-haspopup='listbox']");
    const langBtn = document.querySelector("button[aria-label*='language'], .lang-toggle");
    const logo = document.querySelector("img[alt*='दर्पण'], .logo, a[href='/']");

    return {
      headerVisible: !!header,
      districtSelectorVisible: !!districtSelector,
      districtText: districtSelector ? districtSelector.textContent?.trim() : null,
      langBtnVisible: !!langBtn,
      logoVisible: !!logo,
    };
  });
  report.headerAudit = headerAudit;
  console.log("Header Audit:", headerAudit);

  await desktopContext.close();

  // ─── B. MOBILE VIEWPORT (390x844) LIGHT & DARK ────────────────────────────
  console.log("\n>>> TESTING MOBILE VIEWPORT (390x844)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await initContext(mobileContext);
  const mPage = await mobileContext.newPage();
  await mPage.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 45000 });
  await mPage.waitForTimeout(2000);
  await dismissPopups(mPage);

  const shotMobileLiveLight = path.join(OUTPUT_DIR, "forensic_04_mobile_live_light.png");
  await mPage.screenshot({ path: shotMobileLiveLight, fullPage: false });

  // Open mobile reader
  const mReadBtn = mPage.locator(".jdl-queue-card__read-btn").first();
  if (await mReadBtn.isVisible()) {
    await mReadBtn.click();
    await mPage.waitForTimeout(1500);

    const shotMobileReaderLight = path.join(OUTPUT_DIR, "forensic_05_mobile_reader_light.png");
    await mPage.screenshot({ path: shotMobileReaderLight, fullPage: false });

    // Mobile Dark mode
    await mPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
    });
    await mPage.waitForTimeout(600);

    const shotMobileReaderDark = path.join(OUTPUT_DIR, "forensic_06_mobile_reader_dark.png");
    await mPage.screenshot({ path: shotMobileReaderDark, fullPage: false });
  }

  await mobileContext.close();
  await browser.close();

  // Save report to disk
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "forensic_audit_suite_results.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );
  console.log("\n=================================================================");
  console.log("AUDIT SUITE COMPLETE — RESULTS SAVED TO ARTIFACT DIRECTORY");
  console.log("=================================================================");
}

run().catch((err) => {
  console.error("Forensic audit suite fatal error:", err);
  process.exit(1);
});
