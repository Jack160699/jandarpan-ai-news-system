#!/usr/bin/env node
/**
 * Capture Phase 5 monetization screenshots.
 *
 * Prerequisites:
 *   - Static refs:  http://localhost:3456/design-refs/phase-5/approved-phase-5-screens.html
 *   - Next.js app:  http://localhost:3000  (NEXT_PUBLIC_READER_DS=1)
 *
 * Usage: node scripts/capture-phase-5-screens.mjs
 */

import { chromium } from "@playwright/test";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs/jandarpan-reader-redesign/screenshots/phase-5");

const REF_BASE = "http://localhost:3456";
const REF_URL = `${REF_BASE}/design-refs/phase-5/approved-phase-5-screens.html`;
const APP_BASE = "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

/** @type {Array<{ id: string; route: string; desktop?: boolean }>} */
const SCREENS = [
  { id: "e36-membership", route: "/membership", desktop: true },
  { id: "e37-plans", route: "/membership/plans", desktop: true },
  { id: "e38-paywall", route: "/membership/paywall-preview", desktop: true },
  { id: "e39-checkout", route: "/membership/checkout", desktop: true },
  { id: "e40-success", route: "/membership/success", desktop: true },
  { id: "e41-failure", route: "/membership/failure?reason=checkout-not-live", desktop: true },
  { id: "e42-manage", route: "/membership/manage", desktop: true },
  { id: "e43-adfree", route: "/", desktop: true },
  { id: "e44-native", route: "/", desktop: true },
  { id: "e45-display-ads", route: "/", desktop: true },
  { id: "a2-district-sponsor", route: "/district/raipur", desktop: true },
];

async function screenshotReference(page, id) {
  const el = page.locator(`[data-screen="${id}"]`).first();
  await el.waitFor({ state: "visible", timeout: 15000 });
  await el.scrollIntoViewIfNeeded();
  const out = path.join(OUT_DIR, `${id}-approved-reference.png`);
  await el.screenshot({ path: out });
  console.log(`✓ reference  ${out}`);
}

async function screenshotImplementation(page, screen, viewportName) {
  const res = await page.goto(`${APP_BASE}${screen.route}`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });
  if (!res || res.status() >= 400) {
    console.warn(`⚠ skipped ${screen.id} (${viewportName}) — ${screen.route} → ${res?.status()}`);
    return;
  }
  await page.waitForTimeout(900);

  const hasDs = await page.locator(".jd-ds").count();
  if (!hasDs) {
    console.warn(`⚠ ${screen.id}: .jd-ds missing — is NEXT_PUBLIC_READER_DS=1 set?`);
  }

  // Homepage monetization units sit below the lead — scroll into view for E44/E45.
  if (screen.id === "e44-native" || screen.id === "e45-display-ads") {
    const target =
      screen.id === "e44-native"
        ? page.locator('text=प्रायोजित').first()
        : page.locator('[aria-label="विज्ञापन"]').first();
    await target.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);
  }

  if (screen.id === "a2-district-sponsor") {
    await page.locator('text=ज़िला प्रायोजक').first().scrollIntoViewIfNeeded().catch(() => {});
  }

  const suffix = viewportName === "desktop" ? "-desktop" : "";
  const implOut = path.join(OUT_DIR, `${screen.id}-implementation${suffix}.png`);
  const finalOut = path.join(OUT_DIR, `${screen.id}-corrected-final${suffix}.png`);
  await page.screenshot({ path: implOut, fullPage: false });
  await copyFile(implOut, finalOut);
  console.log(`✓ impl       ${implOut}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  const refContext = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  const refPage = await refContext.newPage();
  console.log("Capturing approved references…");
  await refPage.goto(REF_URL, { waitUntil: "networkidle", timeout: 30000 });
  for (const screen of SCREENS) {
    await screenshotReference(refPage, screen.id).catch((e) =>
      console.warn(`⚠ ref ${screen.id}: ${e.message}`)
    );
  }
  await refContext.close();

  console.log("Capturing mobile implementations…");
  const mobileContext = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobileContext.newPage();
  for (const screen of SCREENS) {
    await screenshotImplementation(mobilePage, screen, "mobile");
  }
  await mobileContext.close();

  console.log("Capturing desktop implementations…");
  const deskContext = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 1,
  });
  const deskPage = await deskContext.newPage();
  for (const screen of SCREENS.filter((s) => s.desktop)) {
    await screenshotImplementation(deskPage, screen, "desktop");
  }
  await deskContext.close();

  await browser.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
