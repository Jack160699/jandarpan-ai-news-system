#!/usr/bin/env node
/**
 * Capture Phase 6 tablet/desktop responsive screenshots.
 *
 * Prerequisites:
 *   - Static refs: http://localhost:3456/design-refs/phase-6/approved-phase-6-desktop.html
 *   - Next.js:     http://localhost:3000  (NEXT_PUBLIC_READER_DS=1)
 *
 * Usage: node scripts/capture-phase-6-screens.mjs
 */

import { chromium } from "@playwright/test";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs/jandarpan-reader-redesign/screenshots/phase-6");

const REF_URL = "http://localhost:3456/design-refs/phase-6/approved-phase-6-desktop.html";
const APP_BASE = "http://localhost:3000";

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
  wide: { width: 1440, height: 900 },
};

/** @type {Array<{ id: string; route: string; refId?: string; viewports: string[]; setup?: string }>} */
const SCREENS = [
  { id: "home", route: "/", refId: "g-home-desktop", viewports: ["mobile", "tablet", "desktop", "wide"] },
  { id: "article", route: "/latest", refId: "g-article-desktop", viewports: ["mobile", "tablet", "desktop"], setup: "first-story" },
  { id: "district", route: "/district/raipur", refId: "g-district-desktop", viewports: ["mobile", "tablet", "desktop"] },
  { id: "category", route: "/category/politics", refId: "g-category-desktop", viewports: ["mobile", "tablet", "desktop"] },
  { id: "search", route: "/search?q=%E0%A4%B0%E0%A4%BE%E0%A4%AF%E0%A4%AA%E0%A5%81%E0%A4%B0", refId: "g-search-desktop", viewports: ["mobile", "tablet", "desktop"] },
  { id: "live", route: "/live", refId: "g-live-desktop", viewports: ["mobile", "tablet", "desktop"] },
];

async function screenshotReference(page, id) {
  const el = page.locator(`[data-screen="${id}"]`).first();
  await el.waitFor({ state: "visible", timeout: 15000 });
  await el.scrollIntoViewIfNeeded();
  const out = path.join(OUT_DIR, `${id}-approved-reference.png`);
  await el.screenshot({ path: out });
  console.log(`✓ reference  ${out}`);
}

async function openStoryFromLatest(page) {
  const link = page.locator('a[href^="/story/"]').first();
  const href = await link.getAttribute("href").catch(() => null);
  if (href) {
    await page.goto(`${APP_BASE}${href}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(700);
    return true;
  }
  return false;
}

async function screenshotImplementation(page, screen, vpName) {
  const res = await page.goto(`${APP_BASE}${screen.route}`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });
  if (!res || res.status() >= 400) {
    console.warn(`⚠ skipped ${screen.id}@${vpName} — ${res?.status()}`);
    return;
  }
  await page.waitForTimeout(800);

  if (screen.setup === "first-story") {
    const ok = await openStoryFromLatest(page);
    if (!ok) console.warn(`⚠ ${screen.id}: no story link from /latest`);
  }

  const hasDs = await page.locator(".jd-ds").count();
  if (!hasDs) console.warn(`⚠ ${screen.id}: .jd-ds missing — flag off?`);

  const hasTopNav = await page.locator(".jd-desktop-nav").evaluateAll((els) =>
    els.some((el) => getComputedStyle(el).display !== "none")
  );
  if ((vpName === "tablet" || vpName === "desktop" || vpName === "wide") && !hasTopNav) {
    console.warn(`⚠ ${screen.id}@${vpName}: desktop nav not visible`);
  }

  const implOut = path.join(OUT_DIR, `${screen.id}-${vpName}-implementation.png`);
  const finalOut = path.join(OUT_DIR, `${screen.id}-${vpName}-corrected-final.png`);
  await page.screenshot({ path: implOut, fullPage: false });
  await copyFile(implOut, finalOut);
  console.log(`✓ impl       ${implOut}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  const refCtx = await browser.newContext({
    viewport: VIEWPORTS.desktop,
    deviceScaleFactor: 1,
  });
  const refPage = await refCtx.newPage();
  console.log("Capturing approved desktop/tablet references…");
  await refPage.goto(REF_URL, { waitUntil: "networkidle", timeout: 30000 });
  for (const id of [
    "g-home-desktop",
    "g-home-tablet",
    "g-article-desktop",
    "g-district-desktop",
    "g-category-desktop",
    "g-search-desktop",
    "g-live-desktop",
  ]) {
    await screenshotReference(refPage, id).catch((e) => console.warn(`⚠ ref ${id}: ${e.message}`));
  }
  await refCtx.close();

  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    console.log(`Capturing ${vpName} implementations…`);
    const ctx = await browser.newContext({
      viewport,
      deviceScaleFactor: vpName === "mobile" ? 2 : 1,
    });
    const page = await ctx.newPage();
    for (const screen of SCREENS) {
      if (!screen.viewports.includes(vpName)) continue;
      await screenshotImplementation(page, screen, vpName);
    }
    await ctx.close();
  }

  await browser.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
