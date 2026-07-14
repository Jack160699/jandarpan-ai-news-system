import { expect, test } from "@playwright/test";
import { primeReaderSession, waitForReaderReady } from "./helpers/reader";

test.describe("mobile reader product", () => {
  test.beforeEach(async ({ page }) => {
    await primeReaderSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("uses one brand, useful live utility data, and the new reader navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForReaderReady(page);

    await expect(page.locator(".jdp-topbar__brand .tenant-logo__img--banner")).toHaveCount(1);
    await expect(page.locator(".jdp-topbar__wordmark")).toHaveCount(0);
    await expect(page.locator(".jdp-topbar__status")).toContainText("IST");
    await expect(page.locator(".live-updates-banner")).toHaveCount(0);

    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav.locator('a[href="/shorts"]')).toBeVisible();
    await expect(nav.locator('a[href="/category/chhattisgarh"]')).toBeVisible();
    await expect(nav.locator('a[href="/live"]')).toHaveCount(0);
    await expect(page.locator(".atlas-trust__date").first()).toBeVisible();
  });

  test("selects a district and opens that district edition", async ({ page }) => {
    await page.goto("/places", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("district-picker")).toBeVisible();

    const bilaspur = page.getByRole("button", { name: /Bilaspur/i });
    await bilaspur.click();
    await expect(page).toHaveURL(/\/district\/bilaspur/, { timeout: 30_000 });
    await expect(page.locator(".dv3-route-root, main").first()).toBeVisible();
  });

  test("opens a complete You dashboard and uses the mobile story width", async ({ page }) => {
    await page.goto("/you", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("profile-v3")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#reading-history")).toBeAttached();
    await expect(page.locator("#saved-stories")).toBeAttached();
    await expect(page.locator("#followed-districts")).toBeAttached();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForReaderReady(page);
    const storyHref = await page.locator('a[href^="/story/"]').first().getAttribute("href");
    expect(storyHref).toBeTruthy();
    await page.goto(storyHref!, { waitUntil: "domcontentloaded" });

    const hero = page.locator(".atlas-story-hero__media");
    const body = page.locator(".atlas-story-body");
    await expect(hero).toBeVisible({ timeout: 20_000 });
    await expect(body).toBeVisible({ timeout: 20_000 });

    const heroBox = await hero.boundingBox();
    const bodyBox = await body.boundingBox();
    expect(heroBox?.x ?? 99).toBeLessThanOrEqual(1);
    expect(heroBox?.width ?? 0).toBeGreaterThanOrEqual(388);
    expect(bodyBox?.x ?? 0).toBeGreaterThanOrEqual(15);
    expect(bodyBox?.width ?? 0).toBeGreaterThanOrEqual(350);
    await expect(page.locator(".atlas-story-intro__time")).toBeVisible();
  });
});
