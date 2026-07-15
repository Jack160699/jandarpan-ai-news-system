import { expect, test } from "@playwright/test";
import { primeReaderSession, waitForReaderReady } from "./helpers/reader";

test.describe("mobile reader product", () => {
  test.beforeEach(async ({ page }) => {
    await primeReaderSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("keeps the mobile shell stable and loads editorial images", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForReaderReady(page);

    await expect(page.locator(".jdp-topbar__brand .tenant-logo__img--banner")).toHaveCount(1);
    await expect(page.locator(".jdp-topbar__wordmark")).toHaveCount(0);
    await expect(page.locator(".jdp-topbar__avatar-link")).toHaveCount(0);
    await expect(page.locator(".jdp-topbar__status")).toBeVisible();
    await expect(page.locator(".jdp-livebar")).toBeVisible();
    await expect(page.locator(".jdp-livebar__search")).toBeVisible();
    await expect(page.locator(".live-updates-banner")).toHaveCount(0);

    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav.locator('a[href="/shorts"]')).toBeVisible();
    await expect(nav.locator('a[href="/category/chhattisgarh"]')).toBeVisible();
    await expect(nav.locator('a[href="/live"]')).toHaveCount(0);
    await expect(page.locator(".atlas-trust__date").first()).toBeVisible();

    const firstImage = page.locator("main img").first();
    await expect(firstImage).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(() => firstImage.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);

    const headerHeight = await page.locator(".jdp-topbar").evaluate((node) => node.getBoundingClientRect().height);
    await page.evaluate(() => window.scrollTo(0, 700));
    await page.waitForTimeout(300);
    const scrolledHeaderHeight = await page.locator(".jdp-topbar").evaluate((node) => node.getBoundingClientRect().height);
    expect(scrolledHeaderHeight).toBe(headerHeight);
    await expect(page.locator(".jdp-bottomnav")).toBeVisible();
    expect(consoleErrors.filter((error) => /hydration/i.test(error))).toEqual([]);
  });

  test("selects a district from the glass popup and opens its edition", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForReaderReady(page);
    const initialUrl = page.url();

    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await nav.getByRole("button").click();
    await expect(page.locator(".district-modal__panel")).toBeVisible();
    expect(page.url()).toBe(initialUrl);

    const bilaspur = page.locator(".district-modal__district").filter({ hasText: /Bilaspur|बिलासपुर/i });
    await bilaspur.click();
    await expect(page).toHaveURL(/\/district\/bilaspur/, { timeout: 30_000 });
    await expect(page.locator(".dv3-route-root, main").first()).toBeVisible();
  });

  test("uses the same product shell on Shorts, News, and You", async ({ page }) => {
    test.setTimeout(90_000);
    for (const route of ["/shorts", "/category/chhattisgarh", "/you"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await waitForReaderReady(page);
      await expect(page.locator(".jdp-topbar")).toBeVisible();
      await expect(page.locator(".jdp-livebar")).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    }
  });

  test("opens a complete You dashboard and uses the mobile story width", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/you", { waitUntil: "domcontentloaded" });
    await waitForReaderReady(page);
    await expect(page.getByTestId("profile-v3")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#reading-history")).toBeAttached({ timeout: 20_000 });
    await expect(page.locator("#saved-stories")).toBeAttached({ timeout: 20_000 });
    await expect(page.locator("#followed-districts")).toBeAttached({ timeout: 20_000 });

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
