import { test, expect } from "@playwright/test";
import path from "node:path";

const VIEWPORTS = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1366", width: 1366, height: 768 },
  { name: "390", width: 390, height: 844 },
] as const;

const SHOT_DIR = path.join("docs", "audits", "admin-v3", "screenshots");

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
}

test.describe("Admin V3 public surfaces", () => {
  for (const vp of VIEWPORTS) {
    test(`login geometry ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/admin/login", { waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page.getByRole("button", { name: /Sign in/i })).toBeVisible({
        timeout: 60_000,
      });
      await assertNoHorizontalOverflow(page);
      await page.screenshot({
        path: path.join(SHOT_DIR, `login-${vp.name}.png`),
        fullPage: true,
      });
    });
  }
});

const hasCreds = Boolean(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);

test.describe("Admin V3 authenticated geometry", () => {
  test.skip(!hasCreds, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set");

  const routes = [
    { key: "overview", path: "/admin/overview" },
    { key: "business", path: "/admin/business" },
    { key: "executive", path: "/admin/executive" },
    { key: "technical", path: "/admin/technical" },
    { key: "health", path: "/admin/health" },
    { key: "gsc", path: "/admin/seo/search-console" },
    { key: "autonomous", path: "/admin/seo/autonomous" },
  ] as const;

  for (const route of routes) {
    test(`${route.key} at 1440`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      await assertNoHorizontalOverflow(page);
      await expect(page.getByText("Loading platform health…")).toHaveCount(0);
      await page.screenshot({
        path: path.join(SHOT_DIR, `${route.key}-1440.png`),
        fullPage: true,
      });
    });
  }
});
