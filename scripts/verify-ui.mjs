import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const TARGET_URL = process.env.TARGET_URL || "https://www.jandarpan.news";
const OUTPUT_DIR = path.resolve("C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d");

async function dismissPopups(page) {
  try {
    const dismissBtn = page.locator("button:has-text('अभी नहीं'), button:has-text('Not now')");
    if (await dismissBtn.first().isVisible({ timeout: 2000 })) {
      await dismissBtn.first().click();
      await page.waitForTimeout(500);
    }
  } catch (e) {
    // Ignore timeout if prompt is not present
  }
}

async function run() {
  console.log(`Starting UI verification against: ${TARGET_URL}`);
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Test
  {
    console.log("Testing Desktop viewport (1440x900)...");
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await dismissPopups(page);

    // Capture initial desktop screenshot
    const desktopTop = path.join(OUTPUT_DIR, "production_desktop_live_top.png");
    await page.screenshot({ path: desktopTop, fullPage: false });
    console.log(`Saved: ${desktopTop}`);

    // Scroll down to verify pinned TV + queue behavior
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(1000);
    const desktopScrolled = path.join(OUTPUT_DIR, "production_desktop_live_scrolled.png");
    await page.screenshot({ path: desktopScrolled, fullPage: false });
    console.log(`Saved: ${desktopScrolled}`);

    // Verify DOM constraints
    const navCount = await page.locator(".jd-bottom-nav, .mobile-dock, .jdp-bottomnav, .jd-nav-spacer").count();
    console.log(`Desktop: Bottom nav/dock elements found: ${navCount}`);

    const profileVisible = await page.locator("a[href='/profile']").isVisible();
    console.log(`Desktop: Profile link in header visible: ${profileVisible}`);

    const pinnedHeader = page.locator(".jdl-mobile-queue__header");
    const hasTitle = await pinnedHeader.locator("text=ताज़ा खबरें").isVisible();
    const hasSublabel = await pinnedHeader.locator("text=चुनिए और TV पर देखें").isVisible();
    console.log(`Desktop: Pinned TV News Control ('ताज़ा खबरें चुनिए और TV पर देखें') visible: ${hasTitle && hasSublabel}`);

    await context.close();
  }

  // 2. Mobile Test
  {
    console.log("Testing Mobile viewport (iPhone 14 / 390x844)...");
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await dismissPopups(page);

    // Capture initial mobile screenshot
    const mobileTop = path.join(OUTPUT_DIR, "production_mobile_live_top.png");
    await page.screenshot({ path: mobileTop, fullPage: false });
    console.log(`Saved: ${mobileTop}`);

    // Scroll down
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(1000);
    const mobileScrolled = path.join(OUTPUT_DIR, "production_mobile_live_scrolled.png");
    await page.screenshot({ path: mobileScrolled, fullPage: false });
    console.log(`Saved: ${mobileScrolled}`);

    // Verify DOM constraints
    const navCount = await page.locator(".jd-bottom-nav, .mobile-dock, .jdp-bottomnav").count();
    console.log(`Mobile: Bottom nav/dock elements count: ${navCount}`);

    const profileVisible = await page.locator("a[href='/profile']").isVisible();
    console.log(`Mobile: Profile link visible: ${profileVisible}`);

    const pinnedHeader = page.locator(".jdl-mobile-queue__header");
    const hasTitle = await pinnedHeader.locator("text=ताज़ा खबरें").isVisible();
    const hasSublabel = await pinnedHeader.locator("text=चुनिए और TV पर देखें").isVisible();
    console.log(`Mobile: Pinned TV News Control ('ताज़ा खबरें चुनिए और TV पर देखें') visible: ${hasTitle && hasSublabel}`);

    await context.close();
  }

  await browser.close();
  console.log("Verification finished successfully!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
