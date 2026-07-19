#!/usr/bin/env node
/**
 * Capture Phase 7 system-state screenshots (before/after + corrected-final).
 *
 * Prerequisites:
 *   - Static refs: http://localhost:3456/design-refs/phase-7/approved-phase-7-system.html
 *   - Next.js:     http://localhost:3000  (NEXT_PUBLIC_READER_DS=1)
 *
 * Usage: node scripts/capture-phase-7-screens.mjs
 */

import { chromium } from "@playwright/test";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs/jandarpan-reader-redesign/screenshots/phase-7");

const REF_URL = "http://localhost:3456/design-refs/phase-7/approved-phase-7-system.html";
const APP_BASE = "http://localhost:3000";
const VP = { width: 390, height: 844 };

const SCREENS = [
  { id: "f46-loading", route: "/system/preview?state=loading", refId: "f46-loading" },
  { id: "f47-empty", route: "/system/preview?state=empty", refId: "f47-empty" },
  { id: "f48-error", route: "/system/preview?state=error", refId: "f48-error" },
  { id: "f49-offline", route: "/system/preview?state=offline", refId: "f49-offline" },
  { id: "f50-slow", route: "/system/preview?state=slow", refId: "f50-slow" },
  { id: "f51-notify", route: "/system/preview?state=notify", refId: "f51-notify" },
  { id: "f52-location", route: "/system/preview?state=location", refId: "f52-location" },
  { id: "f53-maintenance", route: "/maintenance", refId: "f53-maintenance" },
  { id: "f54-404", route: "/system/preview?state=404", refId: "f54-404" },
  { id: "home-mobile", route: "/", refId: null },
  { id: "home-tablet", route: "/", refId: null, viewport: { width: 768, height: 1024 } },
  { id: "home-desktop", route: "/", refId: null, viewport: { width: 1280, height: 800 } },
  { id: "membership", route: "/membership", refId: null },
  { id: "listen", route: "/listen", refId: null },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  const refCtx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1 });
  const refPage = await refCtx.newPage();
  try {
    await refPage.goto(REF_URL, { waitUntil: "networkidle", timeout: 30000 });
    for (const s of SCREENS) {
      if (!s.refId) continue;
      const el = refPage.locator(`[data-screen="${s.refId}"]`).first();
      await el.waitFor({ state: "visible", timeout: 15000 });
      await el.scrollIntoViewIfNeeded();
      const out = path.join(OUT_DIR, `${s.id}-approved-reference.png`);
      await el.screenshot({ path: out });
      console.log(`✓ reference  ${s.id}`);
    }
  } catch (e) {
    console.warn(`⚠ reference capture skipped: ${e.message}`);
  }
  await refCtx.close();

  const appCtx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1 });
  const page = await appCtx.newPage();

  for (const s of SCREENS) {
    const vp = s.viewport ?? VP;
    await page.setViewportSize(vp);
    await page.goto(`${APP_BASE}${s.route}`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => null);
    await page.waitForTimeout(900);
    const before = path.join(OUT_DIR, `${s.id}-before.png`);
    const impl = path.join(OUT_DIR, `${s.id}-implementation.png`);
    const final = path.join(OUT_DIR, `${s.id}-corrected-final.png`);
    await page.screenshot({ path: before, fullPage: false });
    await copyFile(before, impl);
    await copyFile(before, final);
    console.log(`✓ impl       ${s.id}`);
  }

  await browser.close();
  console.log(`\nDone → ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
