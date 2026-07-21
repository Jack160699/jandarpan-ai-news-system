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

  test("desk condensed chrome does not oscillate through trigger region", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-desk-chrome").first()).toBeVisible({ timeout: 30_000 });

    const result = await page.evaluate(async () => {
      const chrome = document.querySelector(".jd-desk-chrome");
      const root = document.querySelector(".jd-desk-chrome-root");
      const full = document.querySelector(".jd-desk-full");
      if (!chrome || !root || !full) {
        return { ok: false as const, reason: "missing chrome" };
      }

      const samples: Array<{
        targetY: number;
        actualY: number;
        condensed: string | null;
        rootH: number;
        fullDisplay: string;
        visibleHeaders: number;
      }> = [];

      let flips = 0;
      let prev = chrome.getAttribute("data-condensed");

      for (let y = 40; y <= 220; y += 4) {
        window.scrollTo(0, y);
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        await new Promise((r) => setTimeout(r, 12));
        const condensed = chrome.getAttribute("data-condensed");
        const actualY = window.scrollY;
        const rootH = root.getBoundingClientRect().height;
        const fullDisplay = getComputedStyle(full).display;
        const sticky = document.querySelector(".jd-desk-sticky");
        const stickyVis =
          sticky && getComputedStyle(sticky).visibility !== "hidden" && getComputedStyle(sticky).display !== "none"
            ? 1
            : 0;
        const fullVis =
          getComputedStyle(full).visibility !== "hidden" && fullDisplay !== "none" ? 1 : 0;
        // Count headers that meaningfully occupy the top band (sticky overlay OR in-flow full).
        const visibleHeaders = condensed === "1" ? stickyVis : fullVis;

        samples.push({ targetY: y, actualY, condensed, rootH, fullDisplay, visibleHeaders });
        if (condensed !== prev) {
          flips += 1;
          prev = condensed;
        }
      }

      // Jitter around old 72px threshold
      for (let i = 0; i < 24; i++) {
        const y = 70 + (i % 2 === 0 ? 10 : -10);
        window.scrollTo(0, y);
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        await new Promise((r) => setTimeout(r, 10));
        const condensed = chrome.getAttribute("data-condensed");
        if (condensed !== prev) {
          flips += 1;
          prev = condensed;
        }
      }

      const overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;
      const heightDelta = Math.max(...samples.map((s) => s.rootH)) - Math.min(...samples.map((s) => s.rootH));
      const scrollJump = samples.some((s) => s.targetY >= 74 && s.targetY <= 100 && s.actualY < 20);
      const displayNoneCollapse = samples.some((s) => s.condensed === "1" && s.fullDisplay === "none");
      const multiHeader = samples.some((s) => s.visibleHeaders > 1);

      // Scroll should remain roughly monotonic vs target (allow small browser rounding)
      let monotonicOk = true;
      for (let i = 1; i < samples.length; i++) {
        if (samples[i].targetY > samples[i - 1].targetY && samples[i].actualY + 30 < samples[i - 1].actualY) {
          monotonicOk = false;
          break;
        }
      }

      return {
        ok: true as const,
        flips,
        heightDelta,
        scrollJump,
        displayNoneCollapse,
        multiHeader,
        overflowX,
        monotonicOk,
        sampleAt80: samples.find((s) => s.targetY === 80),
        sampleAt160: samples.find((s) => s.targetY === 160),
      };
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.displayNoneCollapse).toBe(false);
    expect(result.scrollJump).toBe(false);
    expect(result.monotonicOk).toBe(true);
    expect(result.overflowX).toBe(false);
    expect(result.multiHeader).toBe(false);
    // Enter once, maybe exit once — not thrashing
    expect(result.flips).toBeLessThanOrEqual(2);
    // Full header stays in flow — root height should not collapse ~117px
    expect(result.heightDelta).toBeLessThan(40);
  });

  test("internal navigation keeps document and shows route loading boundary", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 30_000 });

    const nav = await page.evaluate(() => {
      const before = performance.getEntriesByType("navigation").length;
      return { before, href: location.href };
    });

    const story = page.locator('a[href^="/story/"]').first();
    await expect(story).toBeVisible({ timeout: 20_000 });
    await Promise.all([
      page.waitForURL(/\/story\//, { timeout: 30_000 }),
      story.click(),
    ]);

    // Soft navigation — no full document reload
    const after = await page.evaluate(() => performance.getEntriesByType("navigation").length);
    expect(after).toBe(nav.before);
    await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 30_000 });
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
