#!/usr/bin/env node
/**
 * Capture Phase 4 experience / personalization screenshots.
 *
 * Prerequisites:
 *   - Static refs:  http://127.0.0.1:3456/design-refs/phase-4/approved-phase-4-screens.html
 *   - Next.js app:  http://127.0.0.1:3000  (NEXT_PUBLIC_READER_DS=1)
 *
 * Usage: node scripts/capture-phase-4-screens.mjs
 */

import { chromium } from "@playwright/test";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs/jandarpan-reader-redesign/screenshots/phase-4");

const REF_BASE = "http://localhost:3456";
const REF_URL = `${REF_BASE}/design-refs/phase-4/approved-phase-4-screens.html`;
const APP_BASE = "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };

/** @type {Array<{ id: string; route: string; setup?: string }>} */
const SCREENS = [
  { id: "c21-briefing", route: "/listen" },
  { id: "c22-mini-player", route: "/listen?play=1", setup: "mini" },
  { id: "c23-full-player", route: "/listen?play=1", setup: "full" },
  { id: "c24-queue", route: "/listen/queue" },
  { id: "c25-downloads", route: "/listen/downloads" },
  { id: "d26-language", route: "/archive/language" },
  { id: "d29-profile", route: "/archive" },
  { id: "d30-saved", route: "/archive/saved" },
  { id: "d31-history", route: "/archive/history" },
  { id: "d32-followed", route: "/archive/followed" },
  { id: "d33-notifications", route: "/archive/notifications" },
  { id: "d34-districts", route: "/archive/districts" },
  { id: "d35-accessibility", route: "/archive/accessibility" },
];

async function screenshotReference(page, id) {
  const el = page.locator(`[data-screen="${id}"]`).first();
  await el.waitFor({ state: "visible", timeout: 15000 });
  await el.scrollIntoViewIfNeeded();
  const out = path.join(OUT_DIR, `${id}-approved-reference.png`);
  await el.screenshot({ path: out });
  console.log(`✓ reference  ${out}`);
}

async function screenshotImplementation(page, screen) {
  const res = await page.goto(`${APP_BASE}${screen.route}`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });
  if (!res || res.status() >= 400) {
    console.warn(`⚠ skipped ${screen.id} — ${screen.route} → ${res?.status()}`);
    return;
  }
  await page.waitForTimeout(800);

  if (screen.setup === "mini" || screen.setup === "full") {
    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button")];
      const play =
        buttons.find((b) => (b.getAttribute("aria-label") || "").includes("सभी सुनें")) ||
        buttons.find((b) => (b.textContent || "").includes("सभी सुनें"));
      play?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForTimeout(900);
    await page
      .locator('[aria-label="मिनी ऑडियो प्लेयर"]')
      .waitFor({ state: "visible", timeout: 8000 })
      .catch(() => {});
    if (screen.setup === "full") {
      await page.evaluate(() => {
        const open = document.querySelector('[aria-label="फ़ुल प्लेयर खोलें"]');
        open?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      await page.waitForTimeout(700);
      await page
        .locator('[aria-label="फ़ुल ऑडियो प्लेयर"]')
        .waitFor({ state: "visible", timeout: 8000 })
        .catch(() => {});
    }
  }

  if (screen.id === "c25-downloads") {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        (b.textContent || "").includes("डाउनलोड करें")
      );
      btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForTimeout(400);
  }

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
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log("Capturing approved references…");
  await page.goto(REF_URL, { waitUntil: "networkidle", timeout: 30000 });
  for (const screen of SCREENS) {
    await screenshotReference(page, screen.id);
  }

  console.log("Capturing implementation…");
  for (const screen of SCREENS) {
    await screenshotImplementation(page, screen);
  }

  await browser.close();
  console.log(`Done → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
