#!/usr/bin/env node
/**
 * Capture Phase 2 discovery screen references and implementation screenshots.
 *
 * Prerequisites (must already be running — this script does NOT start servers):
 *   - Static refs:  http://127.0.0.1:3456/design-refs/phase-2/approved-phase-2-screens.html
 *   - Next.js app:  http://127.0.0.1:3000  (NEXT_PUBLIC_READER_DS=1)
 *
 * Usage: node scripts/capture-phase-2-screens.mjs
 */

import { chromium } from "@playwright/test";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs/jandarpan-reader-redesign/screenshots/phase-2");

const REF_BASE = "http://127.0.0.1:3456";
const REF_URL = `${REF_BASE}/design-refs/phase-2/approved-phase-2-screens.html`;
const APP_BASE = "http://127.0.0.1:3000";

const VIEWPORT = { width: 390, height: 844 };

/** @type {Array<{ id: string; route: string | null; waitFor?: string; note?: string }>} */
const SCREENS = [
  { id: "a10-district-selector", route: "/district?select=1" },
  { id: "a2-district-home", route: "/district/raipur" },
  { id: "a3-category", route: "/category/politics" },
  { id: "a4-latest", route: "/latest" },
  { id: "a5-trending", route: "/trending" },
  {
    id: "a6-search-overlay",
    route: "/search",
    waitFor: '[role="dialog"][aria-label="खोज"]',
  },
  { id: "a7-search-results", route: "/search?q=%E0%A4%B5%E0%A4%BF%E0%A4%A7%E0%A4%BE%E0%A4%A8%E0%A4%B8%E0%A4%AD%E0%A4%BE" },
  { id: "a8-topic", route: null },
  { id: "a9-live", route: "/live" },
];

/**
 * Resolve first available /topics/{slug} from homepage or search HTML.
 * @param {import('@playwright/test').Page} page
 */
async function resolveTopicSlug(page) {
  const candidates = [];

  for (const url of [`${APP_BASE}/`, `${APP_BASE}/search?q=${encodeURIComponent("विधानसभा")}`]) {
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      if (!res || !res.ok()) continue;
      const slug = await page.evaluate(() => {
        const link = document.querySelector('a[href^="/topics/"]');
        const href = link?.getAttribute("href") ?? "";
        const match = href.match(/^\/topics\/([^/?#]+)/);
        return match?.[1] ?? null;
      });
      if (slug) candidates.push(slug);
    } catch {
      /* try next source */
    }
  }

  const unique = [
    ...new Set([
      ...candidates,
      "chhattisgarh-assembly",
      "industrial-policy",
      "monsoon",
      "politics",
      "raipur",
    ]),
  ];
  for (const slug of unique) {
    try {
      const res = await page.goto(`${APP_BASE}/topics/${slug}`, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      if (res && res.status() < 400) {
        const isDs = await page.locator(".jd-ds").count();
        if (isDs > 0 || res.status() === 200) return slug;
      }
    } catch {
      /* try next slug */
    }
  }

  return null;
}

async function screenshotReference(page, id) {
  const selector = `[data-screen="${id}"]`;
  const el = page.locator(selector).first();
  await el.waitFor({ state: "visible", timeout: 15000 });
  await el.scrollIntoViewIfNeeded();
  const out = path.join(OUT_DIR, `${id}-approved-reference.png`);
  await el.screenshot({ path: out });
  console.log(`✓ reference  ${out}`);
}

async function screenshotImplementation(page, screen, topicSlug) {
  if (screen.id === "a8-topic" && !topicSlug) {
    console.warn(`⚠ skipped a8-topic — no /topics/{slug} found (404 on all candidates)`);
    return;
  }

  let route = screen.route;
  if (screen.id === "a8-topic") {
    route = `/topics/${topicSlug}`;
  }

  const url = `${APP_BASE}${route}`;
  const res = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  if (!res || res.status() >= 400) {
    console.warn(`⚠ skipped ${screen.id} — ${url} returned ${res?.status() ?? "error"}`);
    return;
  }

  if (screen.waitFor) {
    try {
      await page.locator(screen.waitFor).waitFor({ state: "visible", timeout: 8000 });
    } catch {
      // Fallback: open overlay via masthead search control
      const searchBtn = page.locator('button[aria-label="खोजें"]').first();
      if (await searchBtn.count()) {
        await searchBtn.click();
        await page.locator(screen.waitFor).waitFor({ state: "visible", timeout: 8000 });
      } else {
        console.warn(`⚠ ${screen.id}: overlay selector not visible; capturing page as-is`);
      }
    }
  } else {
    await page.waitForTimeout(600);
  }

  const implOut = path.join(OUT_DIR, `${screen.id}-implementation.png`);
  const finalOut = path.join(OUT_DIR, `${screen.id}-corrected-final.png`);

  await page.screenshot({ path: implOut, fullPage: false });
  await copyFile(implOut, finalOut);

  console.log(`✓ impl       ${implOut}`);
  console.log(`✓ final copy ${finalOut}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: "hi-IN",
  });
  const page = await context.newPage();

  console.log(`Reference URL: ${REF_URL}`);
  console.log(`App base:      ${APP_BASE}`);
  console.log(`Output:        ${OUT_DIR}\n`);

  // --- Approved reference mockups (tall viewport so stacked phones are reachable) ---
  const refPage = await context.newPage();
  await refPage.setViewportSize({ width: 480, height: 1200 });
  const refRes = await refPage.goto(REF_URL, { waitUntil: "networkidle", timeout: 30000 });
  if (!refRes || !refRes.ok()) {
    throw new Error(
      `Cannot load reference HTML at ${REF_URL} — is the static server running on :3456?`
    );
  }

  for (const screen of SCREENS) {
    await screenshotReference(refPage, screen.id);
  }
  await refPage.close();

  // --- Implementation routes ---
  const topicSlug = await resolveTopicSlug(page);
  if (topicSlug) {
    console.log(`\nResolved topic slug for a8: /topics/${topicSlug}\n`);
  } else {
    console.log("\nCould not resolve topic slug for a8 — will skip with note.\n");
  }

  for (const screen of SCREENS) {
    await screenshotImplementation(page, screen, topicSlug);
  }

  await browser.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
