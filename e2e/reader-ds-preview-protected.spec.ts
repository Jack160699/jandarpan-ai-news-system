import { expect, test } from "@playwright/test";

/**
 * Protected Preview deployment smoke.
 *
 * Runs only when PLAYWRIGHT_BASE_URL points at a Vercel Preview AND authenticated
 * access is available (storage state / bypass header). If Vercel SSO HTML is
 * detected, the suite reports BLOCKED_BY_VERCEL_SSO and does not fail as a UI bug.
 */

const FLAG = process.env.NEXT_PUBLIC_READER_DS === "1";
const BASE = process.env.PLAYWRIGHT_BASE_URL || "";
const IS_PREVIEW = /vercel\.app/i.test(BASE);

function isVercelSsoHtml(html: string) {
  if (!html) return true;
  const hasJd = /jd-ds|data-testid="jd-reader-ds"/i.test(html);
  if (hasJd) return false;
  return (
    /Vercel Authentication|Authentication Required|vercel\.com\/login/i.test(html) ||
    (/class="[^"]*\bdash\b/i.test(html) && /geist_/i.test(html))
  );
}

test.describe("reader-ds protected Preview smoke", () => {
  test.skip(!FLAG, "Requires NEXT_PUBLIC_READER_DS=1");
  test.skip(!IS_PREVIEW, "Set PLAYWRIGHT_BASE_URL to a Vercel Preview URL");

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    });
  });

  async function assertNotSso(page: import("@playwright/test").Page, path: string) {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    const status = response?.status() ?? 0;
    if (status === 401 || status === 403) {
      test.info().annotations.push({
        type: "infrastructure",
        description: "BLOCKED_BY_VERCEL_SSO",
      });
      test.skip(true, "BLOCKED_BY_VERCEL_SSO");
      return;
    }
    const html = await page.content();
    if (isVercelSsoHtml(html)) {
      test.info().annotations.push({
        type: "infrastructure",
        description: "BLOCKED_BY_VERCEL_SSO",
      });
      test.skip(true, "BLOCKED_BY_VERCEL_SSO");
    }
  }

  test("search filter rail on Preview", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await assertNotSso(page, "/search?q=test");
    await expect(page.getByTestId("jd-reader-ds").or(page.locator(".jd-ds")).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByTestId("jd-search-filter-rail").or(page.locator(".jd-search-filter-rail")).first()
    ).toBeVisible();
    await expect(
      page.getByTestId("jd-search-results-column").or(page.locator(".jd-search-main")).first()
    ).toBeVisible();
  });

  test("login two-panel on Preview", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await assertNotSso(page, "/login");
    await expect(page.getByTestId("jd-reader-ds").or(page.locator(".jd-ds")).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByTestId("jd-login-two-panel").or(page.locator(".jd-signin-card")).first()
    ).toBeVisible();
    await expect(
      page.getByTestId("jd-login-brand-panel").or(page.locator(".jd-signin-brand-panel")).first()
    ).toBeVisible();
    await expect(
      page.getByTestId("jd-login-auth-panel").or(page.locator(".jd-signin-form-panel")).first()
    ).toBeVisible();
  });

  test("category / photo / account rails on Preview", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await assertNotSso(page, "/category/politics");
    await expect(
      page.getByTestId("jd-category-side-rail").or(page.locator(".jd-category-rail")).first()
    ).toBeVisible({ timeout: 30_000 });

    await assertNotSso(page, "/system/preview?state=photo");
    await expect(
      page.getByTestId("jd-photo-thumbnail-rail").or(page.locator(".jd-photo-story__thumbs")).first()
    ).toBeVisible({ timeout: 20_000 });

    await assertNotSso(page, "/archive");
    await expect(
      page.getByTestId("jd-account-nav-rail").or(page.locator(".jd-account-nav")).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
