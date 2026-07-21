/**
 * Formal visual capture script for desktop/tablet fidelity review.
 * Run: NEXT_PUBLIC_READER_DS=1 npx playwright test e2e/reader-ds-formal-visual.spec.ts
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const FLAG = process.env.NEXT_PUBLIC_READER_DS === "1";
const OUT = path.join(
  process.cwd(),
  "docs/jandarpan-reader-redesign/desktop-tablet-screenshots/formal"
);

const CAPTURES: Array<{ name: string; path: string; widths: number[] }> = [
  { name: "home", path: "/", widths: [1440, 1280, 1024, 768, 390] },
  { name: "search", path: "/search?q=रायपुर", widths: [1440, 1024, 768] },
  { name: "category", path: "/category/politics", widths: [1440, 1024, 768] },
  { name: "article", path: "/", widths: [1440, 1024, 768] },
  { name: "login", path: "/login", widths: [1440, 1024, 768] },
  { name: "account", path: "/archive", widths: [1440, 1024, 768] },
];

test.describe("reader-ds formal visual captures", () => {
  test.skip(!FLAG, "Requires NEXT_PUBLIC_READER_DS=1");

  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    });
  });

  for (const capture of CAPTURES) {
    for (const width of capture.widths) {
      test(`${capture.name} @ ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
        await page.goto(capture.path, { waitUntil: "domcontentloaded" });
        await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 30_000 });

        // Prefer a real story for article/photo when landing on /latest
        if (capture.name === "article") {
          const story = page.locator('a[href^="/story/"]').first();
          if (await story.count()) {
            await story.click();
            await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 20_000 });
          }
        }

        const file = path.join(OUT, `${capture.name}-${width}.png`);
        await page.screenshot({ path: file, fullPage: false });
        expect(fs.existsSync(file)).toBeTruthy();
      });
    }
  }

  test("photo story @ 1440/1024/768", async ({ page }) => {
    for (const width of [1440, 1024, 768]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/system/preview?state=photo", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".jd-photo-story").first()).toBeVisible({ timeout: 30_000 });
      if (width >= 768) {
        await expect(page.locator(".jd-photo-story__thumbs").first()).toBeVisible();
      }
      const file = path.join(OUT, `photo-${width}.png`);
      await page.screenshot({ path: file, fullPage: false });
      expect(fs.existsSync(file)).toBeTruthy();
    }
  });
});
