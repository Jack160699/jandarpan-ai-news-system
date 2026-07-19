import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const SHOT_DIR = path.join("docs", "audits", "admin-v3", "screenshots", "mobile-responsive");

const MOBILE_VIEWPORTS = [
  { name: "360x800", width: 360, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "412x915", width: 412, height: 915 },
  { name: "430x932", width: 430, height: 932 },
] as const;

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
}

async function loginIfNeeded(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) return false;

  await page.goto("/admin/login", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator("#admin-email").fill(email);
  await page.locator("#admin-password").fill(password);
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForURL(/\/admin(\/|$)/, { timeout: 60_000 });
  return true;
}

test.describe("Admin V3 mobile login", () => {
  test.describe.configure({ timeout: 90_000 });

  for (const vp of MOBILE_VIEWPORTS) {
    test(`login ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setExtraHTTPHeaders({});
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "userAgent", {
          get: () =>
            "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
        });
      });

      await page.goto("/admin/login", { waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page.getByRole("button", { name: /Sign in/i })).toBeVisible({
        timeout: 60_000,
      });

      await expect(page.getByText(/Production healthy/i)).toHaveCount(0);
      await expect(page.getByText(/Production critical/i)).toHaveCount(0);
      await expect(page.getByText(/Production incident detected/i)).toHaveCount(0);
      await expect(page.locator(".anr-login-v2__visual")).toBeHidden();
      await expect(page.locator(".anr-login-v2__mobile-brand")).toBeVisible();
      await expect(
        page.locator(".anr-login-v2__mobile-brand .anr-login-v2__secure")
      ).toBeVisible();
      await expect(
        page.locator(".anr-login-v2__mobile-brand").getByText(/Protected Jan Darpan/i)
      ).toBeVisible();

      await assertNoHorizontalOverflow(page);
      await page.screenshot({
        path: path.join(SHOT_DIR, `login-${vp.name}.png`),
        fullPage: true,
      });
    });
  }

  test("login loading state 390", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/login", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator("#admin-email").fill("qa@example.com");
    await page.locator("#admin-password").fill("not-a-real-password");
    await page.route("**/api/dashboard/auth/login", async (route) => {
      await new Promise((r) => setTimeout(r, 2500));
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "invalid_credentials" }),
      });
    });
    await page.getByRole("button", { name: /Sign in/i }).click();
    await expect(page.getByText(/Signing in/i)).toBeVisible();
    await page.screenshot({
      path: path.join(SHOT_DIR, "login-loading-390x844.png"),
    });
  });
});

const hasCreds = Boolean(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);

test.describe("Admin V3 mobile authenticated shell", () => {
  test.skip(!hasCreds, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set");

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((ua) => {
      Object.defineProperty(navigator, "userAgent", { get: () => ua });
    }, ANDROID_UA);
    const ok = await loginIfNeeded(page);
    expect(ok).toBeTruthy();
  });

  test("command centre + header + overlays", async ({ page }) => {
    await page.goto("/admin/overview", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(1800);

    await expect(page.locator(".av3-search--desktop")).toBeHidden();
    await expect(page.locator(".av3-env-pill--desktop")).toBeHidden();
    await expect(page.locator(".av3-search-icon")).toBeVisible();
    await expect(page.locator(".av3-status-dot")).toBeVisible();
    await expect(page.locator(".av3-theme-desktop")).toBeHidden();

    const searchBox = page.locator(".av3-topbar input, .av3-search--desktop");
    await expect(searchBox).toHaveCount(0);

    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SHOT_DIR, "command-centre-390x844.png"),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(SHOT_DIR, "mobile-header-390x844.png"),
      clip: { x: 0, y: 0, width: 390, height: 120 },
    });

    // Owner dashboard should not repeat published/review KPIs as hero + grid duplicates
    const publishedCards = page.getByText(/Published today/i);
    await expect(publishedCards).toHaveCount(1);

    // Command search sheet
    await page.locator(".av3-search-icon").click();
    await expect(page.locator(".av3-cmd__panel")).toBeVisible();
    const cmdBox = await page.locator(".av3-cmd__panel").boundingBox();
    expect(cmdBox).toBeTruthy();
    expect(cmdBox!.x).toBeLessThanOrEqual(2);
    expect(cmdBox!.width).toBeGreaterThan(380);
    await page.screenshot({ path: path.join(SHOT_DIR, "command-search-390x844.png") });
    await page.locator(".av3-cmd__close").click();

    // Status sheet
    await page.locator(".av3-status-dot").click();
    await expect(page.locator(".av3-status-popover")).toBeVisible();
    const statusBox = await page.locator(".av3-status-popover").boundingBox();
    expect(statusBox).toBeTruthy();
    expect(statusBox!.x).toBeGreaterThanOrEqual(-1);
    await page.screenshot({ path: path.join(SHOT_DIR, "status-sheet-390x844.png") });
    await page.getByRole("button", { name: /Close status/i }).click();

    // Notifications sheet
    await page.getByRole("button", { name: /Notifications/i }).click();
    await expect(page.locator(".anr-bell__panel")).toBeVisible();
    await page.screenshot({ path: path.join(SHOT_DIR, "notification-sheet-390x844.png") });
    await page.getByRole("button", { name: /Close notifications/i }).click();

    // Drawer
    await page.getByRole("button", { name: /Open navigation/i }).click();
    await expect(page.locator(".av3-sidebar--mobile-open")).toBeVisible();
    await expect(page.getByRole("button", { name: /Collapse/i })).toHaveCount(0);
    await expect(page.locator(".av3-drawer-ws")).toHaveCount(4);
    const routeLink = page.locator(".av3-sidebar--mobile-open .av3-nav-link").first();
    if ((await routeLink.count()) > 0) {
      const box = await routeLink.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(180);
    }
    await expect(page.getByText(/^Team$/i)).toHaveCount(0);
    await expect(page.getByText(/^Settings$/i)).toHaveCount(0);
    await expect(page.getByText(/^Sign out$/i)).toHaveCount(0);
    await page.screenshot({ path: path.join(SHOT_DIR, "nav-drawer-390x844.png") });
    await page.getByRole("button", { name: /Close navigation/i }).first().click();

    // Account menu bottom sheet
    await page.getByRole("button", { name: /Account menu/i }).click();
    await expect(page.locator(".av3-account-menu--header")).toBeVisible();
    const accountBox = await page.locator(".av3-account-menu--header").boundingBox();
    expect(accountBox).toBeTruthy();
    expect(accountBox!.x).toBeGreaterThanOrEqual(-1);
    expect(accountBox!.width).toBeGreaterThan(300);
    await expect(page.getByRole("button", { name: /Sign out/i })).toBeVisible();
    await page.screenshot({ path: path.join(SHOT_DIR, "account-menu-390x844.png") });
  });

  test("workspace homes", async ({ page }) => {
    for (const route of [
      { key: "editorial", path: "/admin/editorial" },
      { key: "business", path: "/admin/business" },
      { key: "platform", path: "/admin/technical" },
    ] as const) {
      await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(1200);
      await assertNoHorizontalOverflow(page);
      await expect(page.locator(".av3-search--desktop")).toBeHidden();
      await page.screenshot({
        path: path.join(SHOT_DIR, `${route.key}-390x844.png`),
        fullPage: true,
      });
    }
  });
});
