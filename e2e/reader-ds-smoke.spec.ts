import { expect, test } from "@playwright/test";

const FLAG = process.env.NEXT_PUBLIC_READER_DS === "1";

test.describe("reader-ds smoke (Phase 7)", () => {
  test.skip(!FLAG, "Requires NEXT_PUBLIC_READER_DS=1");

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    });
  });

  test("homepage exposes design system shell", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".jd-bottom-nav")).toBeVisible();
  });

  test("system states render Hindi copy", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/system/preview?state=empty", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("अभी तक कुछ सहेजा नहीं")).toBeVisible({ timeout: 20_000 });

    await page.goto("/system/preview?state=error");
    await expect(page.getByText("कुछ ठीक नहीं चला")).toBeVisible();

    await page.goto("/system/preview?state=404");
    await expect(page.getByText("यह पृष्ठ नहीं मिला")).toBeVisible();

    await page.goto("/maintenance");
    await expect(page.getByText("हम जल्द लौट रहे हैं")).toBeVisible();
  });

  test("tablet shows desktop primary nav", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-desktop-nav").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".jd-bottom-nav")).toBeHidden();
  });

  test("membership landing remains labeled and gated", async ({ page }) => {
    await page.goto("/membership", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 20_000 });
  });

  test("A1 utility row reserves weather slot without placeholder market tiles", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/weather**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          status: "ok",
          district: "raipur",
          locationEn: "Raipur",
          locationHi: "रायपुर",
          tempC: 29,
          conditionHi: "साफ़",
          conditionEn: "Clear",
          isDay: true,
          weatherCode: 0,
          source: "open-meteo",
          fetchedAt: new Date().toISOString(),
          stale: false,
        }),
      });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-utility-row").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".jd-utility-row").first()).toContainText("29°", { timeout: 15_000 });
    await expect(page.locator(".jd-util-tiles")).toHaveCount(0);
  });

  test("A1 weather unavailable does not invent temperatures", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/weather**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, status: "unavailable", district: "raipur", source: "open-meteo", stale: false }),
      });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const row = page.locator(".jd-utility-row").first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(row).not.toContainText(/\d+°/);
    await expect(page.locator(".jd-util-tiles")).toHaveCount(0);
  });
});
