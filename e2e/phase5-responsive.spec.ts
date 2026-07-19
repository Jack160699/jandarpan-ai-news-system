import { expect, test } from "@playwright/test";
import path from "node:path";
import { authenticateAs, clearE2eDeskSession } from "./helpers/auth";
import { assertNoHorizontalOverflow, assertEditorInsideShell } from "./helpers/responsive";

const SHOT = path.join("docs", "audits", "admin-stabilization", "e2e", "screenshots");

test.describe("Phase 5 responsive", () => {
  for (const [w, h] of [[1920, 1080], [1366, 768], [768, 1024], [390, 844]] as const) {
    test(`${w}x${h}`, async ({ page }) => {
      await clearE2eDeskSession(page.request);
      await page.setViewportSize({ width: w, height: h });
      await authenticateAs(page, "super_admin");
      await page.goto("/admin/overview", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".av3-shell")).toBeVisible({ timeout: 30_000 });
      await assertNoHorizontalOverflow(page);
      await page.screenshot({ path: path.join(SHOT, `cc-${w}x${h}.png`) });
      await authenticateAs(page, "editor");
      await page.goto("/admin/editor", { waitUntil: "domcontentloaded" });
      await assertEditorInsideShell(page);
      await page.screenshot({ path: path.join(SHOT, `editor-${w}x${h}.png`) });
    });
  }
});
