import { test, expect } from "@playwright/test";
import {
  mockSessionApi,
  setE2eDeskSession,
  syncDeskCookiesToBrowser,
} from "./helpers/auth";

const hasCreds = Boolean(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);

test.describe("Admin V3 defect closure", () => {
  test.beforeEach(async ({ page, request, context }) => {
    await setE2eDeskSession(request, "editor");
    await syncDeskCookiesToBrowser(request, context);
    await mockSessionApi(page, "editor");
  });

  test("/admin/editor loads without editorial error fallbacks", async ({ page }) => {
    await page.goto("/admin/editor", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /^Editor$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Newsroom panel error")).toHaveCount(0);
    await expect(page.getByText("Editorial workspace unavailable")).toHaveCount(0);
  });

  test("editorial dashboard failure still shows quick links", async ({ page }) => {
    await page.route("**/api/editorial/dashboard**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "dashboard_timeout" }),
      });
    });

    await page.goto("/admin/editorial", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Editorial overview/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Editorial data unavailable")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Story queue/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("link", { name: /All stories/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Editor$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Retry dashboard/i })).toBeVisible();
  });
});

test.describe("Admin login production status", () => {
  test("login page does not show green connected on live probe alone", async ({ page }) => {
    await page.route("**/api/health/live", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, probe: "live", status: "alive" }),
      });
    });
    await page.route("**/api/status/production", async (route) => {
      await route.abort("failed");
    });

    await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Production systems connected")).toHaveCount(0);
    await expect(page.getByText("Production reachable")).toBeVisible({ timeout: 10_000 });
  });

  test.skip(!hasCreds, "optional authenticated smoke");
});
