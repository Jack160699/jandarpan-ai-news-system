import { expect, test } from "@playwright/test";
import { authenticateAs, clearE2eDeskSession } from "./helpers/auth";

test.describe("Phase 5 failures", () => {
  test.beforeEach(async ({ page, context }) => {
    await clearE2eDeskSession(page.request);
    await context.clearCookies();
  });

  test("notification failure keeps shell", async ({ page }) => {
    await authenticateAs(page, "super_admin");
    await page.route("**/api/admin/notifications**", (r) =>
      r.fulfill({ status: 500, body: '{"ok":false}' })
    );
    await page.goto("/admin/overview", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".av3-shell")).toBeVisible({ timeout: 20_000 });
  });

  test("editorial partial failure keeps nav", async ({ page }) => {
    await authenticateAs(page, "editor");
    await page.route("**/api/editorial/dashboard**", (r) =>
      r.fulfill({ status: 503, body: '{"ok":false}' })
    );
    await page.goto("/admin/editorial", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".av3-shell")).toBeVisible({ timeout: 20_000 });
  });

  test("403 and expired session", async ({ page }) => {
    await authenticateAs(page, "editor");
    await page.goto("/admin/team", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/admin\/team$/);
    await page.context().clearCookies();
    await page.goto("/admin/overview", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
