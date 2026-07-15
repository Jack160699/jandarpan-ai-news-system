import { expect, test } from "@playwright/test";
import { primeReaderSession, waitForReaderReady } from "./helpers/reader";

test.describe("premium mobile homepage", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await primeReaderSession(page);
    await page.addInitScript(() => sessionStorage.removeItem("jdp-top-ten-dismissed"));
  });

  test("uses one district selector and keeps fixed controls clear", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForReaderReady(page);
    await expect(page.locator(".jdp-topbar__place")).toHaveCount(0);
    await expect(page.locator(".jdp-category-rail")).toBeVisible();
    await expect(page.locator(".hp-district-switch")).toBeVisible();
    await expect(page.locator(".top-ten-module")).toBeVisible();
    await expect(page.locator(".jdp-livebar a").first()).toHaveAttribute("href", /^(?:\/story\/|\/#home-atlas-feed)/);

    await page.locator(".hp-district-switch").click();
    await expect(page.getByTestId("district-modal")).toBeVisible();
    await expect(page.locator('[data-district-slug="raipur"]').first()).toBeVisible();
    await page.locator(".district-modal__search input").fill("Bilaspur");
    await page.locator('[data-district-slug="bilaspur"]').first().click();
    await expect(page.getByTestId("district-modal")).toHaveCount(0);
    await expect(page.locator(".hp-district-switch")).toContainText("बिलासपुर");

    await expect(page.locator(".top-ten-dock--collapsed")).toBeVisible({ timeout: 20_000 });
    await page.locator(".top-ten-dock__dismiss").click();
    await expect(page.locator(".top-ten-dock")).toHaveCount(0);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await expect(page.locator("main h1")).toHaveCount(1);
    const leadImage = page.locator(".atlas-hero img");
    await expect(leadImage).toBeVisible();
    await expect.poll(() => leadImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);

    for (const width of [320, 360, 375, 390, 412, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(page.locator(".jdp-topbar")).toBeVisible();
      await expect(page.locator(".atlas-hero")).toBeVisible();
      const metrics = await page.evaluate(() => ({
        viewport: window.innerWidth,
        page: document.documentElement.scrollWidth,
        h1: document.querySelectorAll("main h1").length,
      }));
      expect(metrics.page - metrics.viewport).toBeLessThanOrEqual(1);
      expect(metrics.h1).toBe(1);
    }

    for (const viewport of [
      { width: 768, height: 1024 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expect(page.locator(".jdp-category-rail")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "release-proof/homepage-mobile-390.png", fullPage: true });
  });
});
