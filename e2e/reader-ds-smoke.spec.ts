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

    await page.goto("/system/preview?state=error", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("कुछ ठीक नहीं चला")).toBeVisible({ timeout: 20_000 });

    await page.goto("/system/preview?state=404", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("यह पृष्ठ नहीं मिला")).toBeVisible({ timeout: 20_000 });

    await page.goto("/maintenance", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("हम जल्द लौट रहे हैं")).toBeVisible({ timeout: 20_000 });
  });

  test("tablet shows desktop primary nav", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-desk-chrome").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".jd-desk-catnav").first()).toBeVisible();
    await expect(page.locator(".jd-bottom-nav").first()).toBeHidden();
  });

  test("desktop shows SoT editorial chrome and footer", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-desk-chrome").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".jd-desk-brand").first()).toBeVisible();
    await expect(page.locator(".jd-desk-footer").first()).toBeVisible();
    await expect(page.locator(".jd-masthead").first()).toBeHidden();
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

  test("search filter rail sticky on desktop; drawer on phone", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/search?q=रायपुर", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jd-reader-ds").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("jd-search-filter-rail").first()).toBeVisible();
    await expect(page.getByTestId("jd-search-results-column").first()).toBeVisible();
    await expect(page.locator(".jd-search-hero").first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/search?q=रायपुर", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-search-phone-bar").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("jd-search-filter-rail")).toBeHidden();
    await page.getByTestId("jd-search-filter-trigger").click();
    await expect(page.getByTestId("jd-search-drawer")).toBeVisible({ timeout: 10_000 });
  });

  test("category page exposes skyscraper rail on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/category/politics", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jd-category-side-rail").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-jd-ad-placement="category.skyscraper"]').first()).toBeVisible();
  });

  test("login uses two-panel layout on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jd-login-two-panel").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("jd-login-brand-panel").first()).toBeVisible();
    await expect(page.getByTestId("jd-login-auth-panel").first()).toBeVisible();
    await expect(page.locator("#jd-d28-mobile").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /OTP|ओटीपी/i }).first()).toBeDisabled();
  });

  test("account dual-rail collapses on tablet and expands on wide desktop", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/archive", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jd-account-nav-rail").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".jd-account-utility").first()).toBeHidden();

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/archive", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jd-account-nav-rail").first()).toBeVisible();
    await expect(page.locator(".jd-account-utility").first()).toBeVisible();
  });

  test("mobile More page shows guest account card with Google sign-in", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/archive", { waitUntil: "domcontentloaded" });
    const card = page.getByTestId("jd-account-card").first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card).toHaveAttribute("data-state", /guest|loading/);
    await expect(page.getByTestId("jd-account-google-signin").first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("jd-account-continue-guest").first()).toBeVisible();
    await expect(page.getByTestId("jd-account-benefits").first()).toBeVisible();
    // Login stays discoverable at top — not only buried in settings rows
    const googleBox = await page.getByTestId("jd-account-google-signin").first().boundingBox();
    expect(googleBox?.y ?? 9999).toBeLessThan(520);
  });

  test("reserved ad slots keep labelled no-fill dimensions", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const leader = page
      .locator('[data-testid="jd-reserved-ad"][data-jd-ad-placement="home.leaderboard"]')
      .first();
    await expect(leader).toBeVisible({ timeout: 30_000 });
    const box = await leader.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(88);
    await expect(leader).toContainText(/विज्ञापन|Advertisement/);
  });

  test("phone chrome remains active below 768", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-bottom-nav").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".jd-desk-chrome").first()).toBeHidden();
  });

  test("photo story thumb rail on tablet/desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/system/preview?state=photo", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-photo-story").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("jd-photo-thumbnail-rail").first()).toBeVisible();
    await expect(page.getByTestId("jd-photo-thumb-0")).toBeVisible();
    await page.getByTestId("jd-photo-thumb-1").click();
    await expect(page.getByTestId("jd-photo-thumb-1")).toHaveClass(/is-active/);
    await expect(page.getByTestId("jd-photo-thumb-1")).toHaveAttribute("aria-current", "true");
  });
});
