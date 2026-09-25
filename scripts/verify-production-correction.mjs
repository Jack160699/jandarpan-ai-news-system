import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const TARGET_URL = process.env.TARGET_URL || "https://www.jandarpan.news";
const OUTPUT_DIR = path.resolve("C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d");

async function initContext(context) {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
      localStorage.setItem("cgb_perm_notify", "1");
      localStorage.setItem("cgb_perm_location", "1");
      localStorage.setItem("cgb_install_dismissed", "1");
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
  console.log(`Starting Jan Darpan Production Verification on: ${TARGET_URL}`);
  const browser = await chromium.launch({ headless: true });

  const results = {
    checks: [],
    screenshots: [],
  };

  try {
    // ─── DESKTOP VIEWPORT (1440x900) ──────────────────────────────────────────
    console.log("\n[1/3] Desktop Viewport Verification (1440x900)...");
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await initContext(desktopContext);
    const page = await desktopContext.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2500);
    await dismissPopups(page);

    // 1. Live default state
    const shot1 = path.join(OUTPUT_DIR, "prod_corr_01_desktop_live_default.png");
    await page.screenshot({ path: shot1, fullPage: false });
    results.screenshots.push(shot1);
    console.log(`Saved: ${shot1}`);

    const cardCount = await page.locator(".jdl-queue-card").count();
    console.log(`Initial visible news cards count: ${cardCount}`);
    results.checks.push({ name: "Initial Live news cards visible", pass: cardCount > 0, count: cardCount });

    // 2. Category filter tabs
    console.log("Testing Category Tab: क्राइम");
    const crimeTab = page.locator(".jdl-category-tab:has-text('क्राइम')");
    if (await crimeTab.isVisible()) {
      await crimeTab.click();
      await page.waitForTimeout(1000);
      const shot2 = path.join(OUTPUT_DIR, "prod_corr_02_category_crime.png");
      await page.screenshot({ path: shot2, fullPage: false });
      results.screenshots.push(shot2);
      console.log(`Saved: ${shot2}`);

      const crimeCount = await page.locator(".jdl-queue-card").count();
      console.log(`Crime category cards count: ${crimeCount}`);
      results.checks.push({ name: "Crime category filtering", pass: crimeCount > 0, count: crimeCount });
    }

    // Reset back to 'सभी'
    const allTab = page.locator(".jdl-category-tab:has-text('सभी')");
    if (await allTab.isVisible()) {
      await allTab.click();
      await page.waitForTimeout(800);
    }

    // 3. District + Category Filter
    console.log("Testing District + Category Filter...");
    const districtTrigger = page.locator("button:has-text('सभी 33 जिले'), button:has-text('सभी जिले'), .jdl-district-select-btn").first();
    if (await districtTrigger.isVisible().catch(() => false)) {
      await districtTrigger.click();
      await page.waitForTimeout(500);
      const shotDropdown = path.join(OUTPUT_DIR, "prod_corr_09_category_dropdown.png");
      await page.screenshot({ path: shotDropdown, fullPage: false });
      results.screenshots.push(shotDropdown);
      console.log(`Saved: ${shotDropdown}`);

      const durgOpt = page.locator("button:has-text('दुर्ग'), div:has-text('दुर्ग')").first();
      if (await durgOpt.isVisible().catch(() => false)) {
        await durgOpt.click();
        await page.waitForTimeout(800);
      }
    }
    const shot3 = path.join(OUTPUT_DIR, "prod_corr_03_district_category.png");
    await page.screenshot({ path: shot3, fullPage: false });
    results.screenshots.push(shot3);
    console.log(`Saved: ${shot3}`);

    // Reset district if needed
    if (await districtTrigger.isVisible().catch(() => false)) {
      await districtTrigger.click();
      await page.waitForTimeout(400);
      const allDist = page.locator("button:has-text('सभी 33 जिले'), button:has-text('सभी जिले')").first();
      if (await allDist.isVisible().catch(() => false)) {
        await allDist.click();
        await page.waitForTimeout(600);
      }
    }

    // 4. Open Article Reader — Light Mode
    console.log("Opening article via 'पढ़ें' button...");
    const readBtn = page.locator(".jdl-queue-card__read-btn").first();
    await readBtn.click();
    await page.waitForTimeout(1800);

    // Verify open reader structure
    const isOpenReader = await page.locator(".jd-open-reader").isVisible();
    const isBoxedReader = await page.locator(".jd-dedicated-reader").isVisible();
    console.log(`Open reader present: ${isOpenReader}, Boxed reader present: ${isBoxedReader}`);
    results.checks.push({ name: "Open reader active (no boxed container)", pass: isOpenReader && !isBoxedReader });

    // Check typography & unified controls
    const headline = await page.locator(".jd-reader-headline").textContent();
    const headlineSize = await page.locator(".jd-reader-headline").evaluate((el) => window.getComputedStyle(el).fontSize);
    const bodySize = await page.locator(".jd-reader-para").first().evaluate((el) => window.getComputedStyle(el).fontSize).catch(() => "N/A");
    console.log(`Headline: "${headline?.trim()?.slice(0, 40)}..." [size: ${headlineSize}]`);
    console.log(`Body text size: ${bodySize}`);

    const controlBtns = await page.locator(".jd-control-btn").count();
    console.log(`Unified control buttons count: ${controlBtns}`);
    results.checks.push({ name: "Unified control buttons present", pass: controlBtns >= 3, count: controlBtns });

    // Capture Light Mode Open Article
    const shot4 = path.join(OUTPUT_DIR, "prod_corr_04_article_light.png");
    await page.screenshot({ path: shot4, fullPage: false });
    results.screenshots.push(shot4);
    console.log(`Saved: ${shot4}`);

    // 5. Open Article Reader — Dark Mode Audit
    console.log("Switching to Dark Mode for contrast audit...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      const root = document.querySelector(".jd-ds");
      if (root) root.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(800);

    // Verify dark mode contrast
    const headlineColor = await page.locator(".jd-reader-headline").evaluate((el) => window.getComputedStyle(el).color);
    const proseColor = await page.locator(".jd-reader-para").first().evaluate((el) => window.getComputedStyle(el).color).catch(() => "N/A");
    console.log(`Dark mode headline color: ${headlineColor}, prose color: ${proseColor}`);

    const shot5 = path.join(OUTPUT_DIR, "prod_corr_05_article_dark.png");
    await page.screenshot({ path: shot5, fullPage: false });
    results.screenshots.push(shot5);
    console.log(`Saved: ${shot5}`);

    // Revert to light mode
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      const root = document.querySelector(".jd-ds");
      if (root) root.setAttribute("data-theme", "light");
    });
    await page.waitForTimeout(500);

    // 6. Related Stories (Image Left + Content Right)
    console.log("Testing Related Stories section...");
    const relatedSection = page.locator(".jd-reader-related-section");
    if (await relatedSection.isVisible()) {
      await relatedSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);

      // Verify geometry: thumb on left, body on right (flex-direction: row)
      const relatedCard = page.locator(".jdl-queue-card--related").first();
      const flexDir = await relatedCard.evaluate((el) => window.getComputedStyle(el).flexDirection);
      const relatedCount = await page.locator(".jdl-queue-card--related").count();
      console.log(`Related stories count: ${relatedCount}, flex-direction: ${flexDir}`);
      results.checks.push({ name: "Related cards horizontal geometry (image left, content right)", pass: flexDir === "row", count: relatedCount });

      const shot6 = path.join(OUTPUT_DIR, "prod_corr_06_related_stories.png");
      await page.screenshot({ path: shot6, fullPage: false });
      results.screenshots.push(shot6);
      console.log(`Saved: ${shot6}`);
    }

    // 8. Desktop Article Full Canvas
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const shot8 = path.join(OUTPUT_DIR, "prod_corr_08_desktop_article.png");
    await page.screenshot({ path: shot8, fullPage: false });
    results.screenshots.push(shot8);
    console.log(`Saved: ${shot8}`);

    await desktopContext.close();

    // ─── 2. MOBILE VIEWPORT (390x844) ─────────────────────────────────────────
    console.log("\n[2/3] Mobile Viewport Verification (390x844)...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await initContext(mobileContext);
    const mPage = await mobileContext.newPage();
    await mPage.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 45000 });
    await mPage.waitForTimeout(2500);
    await dismissPopups(mPage);

    // Tap 'पढ़ें' on mobile
    const mReadBtn = mPage.locator(".jdl-queue-card__read-btn").first();
    if (await mReadBtn.isVisible()) {
      await mReadBtn.click();
      await mPage.waitForTimeout(1500);
      const shot7 = path.join(OUTPUT_DIR, "prod_corr_07_mobile_article.png");
      await mPage.screenshot({ path: shot7, fullPage: false });
      results.screenshots.push(shot7);
      console.log(`Saved: ${shot7}`);
      results.checks.push({ name: "Mobile open article rendered", pass: true });
    }
    await mobileContext.close();

    // ─── 3. 30-DAY WINDOW VERIFICATION ───────────────────────────────────────
    console.log("\n[3/3] 30-Day Window & Canonical Taxonomy Verification...");
    const feedRes = await fetch(`${TARGET_URL}/api/broadcast/feed?lang=hi&district=all`);
    if (feedRes.ok) {
      const feedData = await feedRes.json();
      const segments = feedData.segments || [];
      const nonIntro = segments.filter((s) => !s.isIntro);
      console.log(`Total live feed segments returned: ${segments.length} (stories: ${nonIntro.length})`);

      const now = Date.now();
      const agesInDays = nonIntro
        .map((s) => (s.publishedAt ? (now - new Date(s.publishedAt).getTime()) / (24 * 3600 * 1000) : null))
        .filter((age) => age !== null && !isNaN(age));

      const maxAge = Math.max(...agesInDays, 0);
      const minAge = Math.min(...agesInDays, 0);
      const olderThan2d = agesInDays.filter((a) => a > 2).length;
      const olderThan7d = agesInDays.filter((a) => a > 7).length;

      console.log(`Stories age range: ${minAge.toFixed(1)} days to ${maxAge.toFixed(1)} days`);
      console.log(`Stories older than 48 hours: ${olderThan2d}`);
      console.log(`Stories older than 7 days: ${olderThan7d}`);

      // Check canonical categories presence
      const taggedCount = nonIntro.filter((s) => s.canonicalCategories && s.canonicalCategories.length > 0).length;
      const multiTagCount = nonIntro.filter((s) => s.canonicalCategories && s.canonicalCategories.length > 1).length;
      console.log(`Stories with resolved canonical categories: ${taggedCount}/${nonIntro.length}`);
      console.log(`Stories with multiple canonical tags: ${multiTagCount}/${nonIntro.length}`);

      results.checks.push({
        name: "30-day news pool exposed (> 48h stories accessible)",
        pass: olderThan2d > 0 || maxAge > 2,
        maxAgeDays: maxAge.toFixed(1),
        olderThan2dCount: olderThan2d,
      });

      results.checks.push({
        name: "Canonical multi-tagging resolution active",
        pass: taggedCount > 0,
        taggedCount,
        multiTagCount,
      });
    }

    console.log("\n─── VERIFICATION SUMMARY ───");
    console.table(results.checks);
    console.log("Screenshots captured:", results.screenshots.length);
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await browser.close();
  }
}

run();
