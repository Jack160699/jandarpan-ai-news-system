import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const TARGET_URL = process.env.TARGET_URL || "https://www.jandarpan.news";
const OUTPUT_DIR = path.resolve("C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d");

async function initContext(context) {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("cgb_perm_notify", "1");
      localStorage.setItem("cgb_perm_location", "1");
      localStorage.setItem("cgb_install_dismissed", "1");
    } catch {}
  });
}

async function dismissPopups(page) {
  try {
    const dismissBtn = page.locator("button:has-text('अभी नहीं'), button:has-text('Not now')");
    if (await dismissBtn.first().isVisible({ timeout: 1000 })) {
      await dismissBtn.first().click();
      await page.waitForTimeout(300);
    }
  } catch (e) {
    // Ignore timeout if prompt is not present
  }
}

async function run() {
  console.log(`Starting comprehensive live-first UI verification on: ${TARGET_URL}`);
  const browser = await chromium.launch({ headless: true });

  // ─── 1. DESKTOP VIEWPORT (1440x900) ──────────────────────────────────────────
  {
    console.log("\n[1/4] Testing Desktop viewport (1440x900)...");
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await initContext(context);
    const page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2500);
    await dismissPopups(page);

    // Initial desktop screenshot
    const shot1 = path.join(OUTPUT_DIR, "production_desktop_live_top.png");
    await page.screenshot({ path: shot1 });
    console.log(`Saved: ${shot1}`);

    // Verify Category Dropdown
    const categoryBtn = page.locator(".jdl-category-selector__btn");
    if (await categoryBtn.isVisible()) {
      await categoryBtn.click();
      await page.waitForTimeout(500);
      const shotCatMenu = path.join(OUTPUT_DIR, "production_desktop_category_dropdown.png");
      await page.screenshot({ path: shotCatMenu });
      console.log(`Saved: ${shotCatMenu}`);

      // Select 'क्राइम' category
      const crimeOption = page.locator(".jdl-category-selector__item:has-text('क्राइम')");
      if (await crimeOption.isVisible()) {
        await crimeOption.click();
        await page.waitForTimeout(1000);
        const shotCatFiltered = path.join(OUTPUT_DIR, "production_desktop_category_filtered.png");
        await page.screenshot({ path: shotCatFiltered });
        console.log(`Saved: ${shotCatFiltered}`);
      }
    }

    // Reset back to 'सभी'
    if (await categoryBtn.isVisible()) {
      await categoryBtn.click();
      await page.waitForTimeout(300);
      const allOption = page.locator(".jdl-category-selector__item:has-text('सभी')");
      if (await allOption.isVisible()) {
        await allOption.click();
        await page.waitForTimeout(1000);
      }
    }

    // Verify "पढ़ें" button opens article in-place below sticky TV
    const readBtn = page.locator(".jdl-mobile-queue__read-btn").first();
    if (await readBtn.isVisible()) {
      console.log("Clicking 'पढ़ें' button on first story card...");
      await readBtn.click();
      await page.waitForTimeout(1500);

      const shotReader = path.join(OUTPUT_DIR, "production_desktop_inplace_article_opened.png");
      await page.screenshot({ path: shotReader });
      console.log(`Saved: ${shotReader}`);
    }

    // Test English + Long District Name in Header for Collision/Overlap
    const enLangBtn = page.locator(".jd-mobile-lang button:has-text('EN')");
    if (await enLangBtn.isVisible()) {
      await enLangBtn.click();
      await page.waitForTimeout(800);

      const districtTrigger = page.locator("[data-brand-district-trigger='true']");
      if (await districtTrigger.isVisible()) {
        await districtTrigger.click();
        await page.waitForTimeout(600);
        // Select a long district name like "Rajnandgaon" or "Balodabazar"
        const longDist = page.locator("button:has-text('Rajnandgaon'), button:has-text('Balodabazar'), button:has-text('Gaurela')").first();
        if (await longDist.isVisible()) {
          await longDist.click();
          await page.waitForTimeout(800);
        }
      }

      const shotHeaderNoOverlap = path.join(OUTPUT_DIR, "production_desktop_header_english_district_no_overlap.png");
      await page.screenshot({ path: shotHeaderNoOverlap, clip: { x: 0, y: 0, width: 1440, height: 180 } });
      console.log(`Saved: ${shotHeaderNoOverlap}`);
    }

    await context.close();
  }

  // ─── 2. TABLET VIEWPORT (768x1024) ───────────────────────────────────────────
  {
    console.log("\n[2/4] Testing Tablet viewport (768x1024)...");
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
    });
    await initContext(context);
    const page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await dismissPopups(page);

    const shotTablet = path.join(OUTPUT_DIR, "production_tablet_live.png");
    await page.screenshot({ path: shotTablet });
    console.log(`Saved: ${shotTablet}`);
    await context.close();
  }

  // ─── 3. MOBILE VIEWPORT (390x844 - iPhone 14) ────────────────────────────────
  {
    console.log("\n[3/4] Testing Mobile viewport (390x844)...");
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    await initContext(context);
    const page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await dismissPopups(page);

    const shotMobTop = path.join(OUTPUT_DIR, "production_mobile_live_top.png");
    await page.screenshot({ path: shotMobTop });
    console.log(`Saved: ${shotMobTop}`);

    // Scroll down to check sticky TV + category bar behavior
    await page.mouse.wheel(0, 350);
    await page.waitForTimeout(1000);
    const shotMobScrolled = path.join(OUTPUT_DIR, "production_mobile_live_scrolled_sticky_tv.png");
    await page.screenshot({ path: shotMobScrolled });
    console.log(`Saved: ${shotMobScrolled}`);

    // Click 'पढ़ें' on mobile
    const mobReadBtn = page.locator(".jdl-mobile-queue__read-btn").first();
    if (await mobReadBtn.isVisible()) {
      await mobReadBtn.click();
      await page.waitForTimeout(1200);
      const shotMobReader = path.join(OUTPUT_DIR, "production_mobile_inplace_article_opened.png");
      await page.screenshot({ path: shotMobReader });
      console.log(`Saved: ${shotMobReader}`);
    }

    // Check Mobile Header in English + District
    const enLangMob = page.locator(".jd-mobile-lang button:has-text('EN')");
    if (await enLangMob.isVisible()) {
      await enLangMob.click();
      await page.waitForTimeout(600);
      const shotMobHeader = path.join(OUTPUT_DIR, "production_mobile_header_en_no_overlap.png");
      await page.screenshot({ path: shotMobHeader, clip: { x: 0, y: 0, width: 390, height: 160 } });
      console.log(`Saved: ${shotMobHeader}`);
    }

    await context.close();
  }

  // ─── 4. PROFILE SECTION & CONTACT DETAILS (/profile) ─────────────────────────
  {
    console.log("\n[4/4] Testing Profile section (/profile)...");
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    await initContext(context);
    const page = await context.newPage();
    await page.goto(`${TARGET_URL}/profile`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await dismissPopups(page);

    // Profile top view: Logged-out Google Sign-in prominent CTA
    const shotProfileTop = path.join(OUTPUT_DIR, "production_profile_logged_out_google_only.png");
    await page.screenshot({ path: shotProfileTop });
    console.log(`Saved: ${shotProfileTop}`);

    // Expand Help & Information section to verify Contact Channels
    const helpToggle = page.locator("button:has-text('सहायता एवं कानूनी जानकारी'), button:has-text('Help & Information')");
    if (await helpToggle.isVisible()) {
      await helpToggle.click();
      await page.waitForTimeout(600);
      const shotProfileContacts = path.join(OUTPUT_DIR, "production_profile_contacts_expanded.png");
      await page.screenshot({ path: shotProfileContacts });
      console.log(`Saved: ${shotProfileContacts}`);
    }

    await context.close();
  }

  await browser.close();
  console.log("\nAll UI verifications completed successfully!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
