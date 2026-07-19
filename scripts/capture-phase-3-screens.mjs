#!/usr/bin/env node
/**
 * Capture Phase 3 article template references and implementation screenshots.
 *
 * Prerequisites:
 *   - Static refs:  http://127.0.0.1:3456/design-refs/phase-3/approved-phase-3-screens.html
 *   - Next.js app:  http://127.0.0.1:3000  (NEXT_PUBLIC_READER_DS=1)
 *
 * Usage: node scripts/capture-phase-3-screens.mjs
 */

import { chromium } from "@playwright/test";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs/jandarpan-reader-redesign/screenshots/phase-3");

const REF_BASE = "http://127.0.0.1:3456";
const REF_URL = `${REF_BASE}/design-refs/phase-3/approved-phase-3-screens.html`;
const APP_BASE = "http://127.0.0.1:3000";
const VIEWPORT = { width: 390, height: 844 };

/** @type {Array<{ id: string; variant?: string; route?: string }>} */
const SCREENS = [
  { id: "b11-standard", variant: "standard" },
  { id: "b12-breaking", variant: "breaking" },
  { id: "b13-live-blog", variant: "live-blog" },
  { id: "b14-photo", variant: "photo" },
  { id: "b15-video", variant: "video" },
  { id: "b16-explainer", variant: "explainer" },
  { id: "b17-opinion", variant: "opinion" },
  { id: "b17-editorial", variant: "editorial" },
  { id: "b18-sponsored", variant: "sponsored" },
  { id: "b19-premium", variant: "premium" },
  { id: "b20-no-image", variant: "no-image" },
];

async function resolveStorySlug(page) {
  const candidates = ["/", "/latest", "/trending"];
  for (const route of candidates) {
    try {
      const res = await page.goto(`${APP_BASE}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      if (!res || res.status() >= 400) continue;
      const slug = await page.evaluate(() => {
        const link = document.querySelector('a[href^="/story/"]');
        const href = link?.getAttribute("href") ?? "";
        const match = href.match(/^\/story\/([^/?#]+)/);
        return match?.[1] ?? null;
      });
      if (slug) return slug;
    } catch {
      /* next */
    }
  }
  return null;
}

async function resolveLiveSlug(page) {
  try {
    const res = await page.goto(`${APP_BASE}/live`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    if (!res || res.status() >= 400) return null;
    return await page.evaluate(() => {
      const link = document.querySelector('a[href^="/live/"]');
      const href = link?.getAttribute("href") ?? "";
      const match = href.match(/^\/live\/([^/?#]+)/);
      return match?.[1] ?? null;
    });
  } catch {
    return null;
  }
}

async function screenshotReference(page, id) {
  // b17-editorial shares B17 mockup with opinion
  const refId = id === "b17-editorial" ? "b17-opinion" : id;
  const el = page.locator(`[data-screen="${refId}"]`).first();
  await el.waitFor({ state: "visible", timeout: 15000 });
  await el.scrollIntoViewIfNeeded();
  const out = path.join(OUT_DIR, `${id}-approved-reference.png`);
  await el.screenshot({ path: out });
  console.log(`✓ reference  ${out}`);
}

async function screenshotImplementation(page, screen, storySlug, liveSlug) {
  let url = null;
  if (screen.id === "b13-live-blog" && liveSlug) {
    url = `${APP_BASE}/live/${liveSlug}`;
  } else if (screen.variant && storySlug) {
    url = `${APP_BASE}/story/${storySlug}?dsVariant=${encodeURIComponent(screen.variant)}`;
  } else {
    console.warn(`⚠ skipped ${screen.id} — no story slug`);
    return;
  }

  const res = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  if (!res || res.status() >= 400) {
    console.warn(`⚠ skipped ${screen.id} — ${url} → ${res?.status()}`);
    return;
  }
  await page.waitForTimeout(700);
  const hasDs = await page.locator(".jd-ds").count();
  if (!hasDs) {
    console.warn(`⚠ ${screen.id}: .jd-ds missing — is NEXT_PUBLIC_READER_DS=1 set?`);
  }

  const implOut = path.join(OUT_DIR, `${screen.id}-implementation.png`);
  const finalOut = path.join(OUT_DIR, `${screen.id}-corrected-final.png`);
  await page.screenshot({ path: implOut, fullPage: false });
  await copyFile(implOut, finalOut);
  console.log(`✓ impl       ${implOut}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: "hi-IN",
  });

  const refPage = await context.newPage();
  await refPage.setViewportSize({ width: 480, height: 1200 });
  const refRes = await refPage.goto(REF_URL, { waitUntil: "networkidle", timeout: 30000 });
  if (!refRes || !refRes.ok()) {
    throw new Error(`Cannot load ${REF_URL} — start static server on :3456`);
  }
  for (const screen of SCREENS) {
    await screenshotReference(refPage, screen.id);
  }
  await refPage.close();

  const page = await context.newPage();
  const storySlug = await resolveStorySlug(page);
  const liveSlug = await resolveLiveSlug(page);
  console.log(`Story slug: ${storySlug ?? "(none)"}`);
  console.log(`Live slug:  ${liveSlug ?? "(none)"}\n`);

  for (const screen of SCREENS) {
    await screenshotImplementation(page, screen, storySlug, liveSlug);
  }

  await browser.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
