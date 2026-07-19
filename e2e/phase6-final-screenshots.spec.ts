import { expect, test } from "@playwright/test";
import path from "node:path";
import { authenticateAs, clearE2eDeskSession } from "./helpers/auth";

const SHOT = path.join(
  "docs",
  "audits",
  "admin-stabilization",
  "final-screenshots"
);

const VIEWPORTS = [
  [1920, 1080],
  [1440, 900],
  [1366, 768],
  [768, 1024],
  [430, 932],
  [390, 844],
  [360, 800],
] as const;

const ROUTES: Array<{ name: string; path: string; role?: "super_admin" | "editor" }> = [
  { name: "login", path: "/admin/login" },
  { name: "command-centre", path: "/admin/overview", role: "super_admin" },
  { name: "editorial", path: "/admin/editorial", role: "editor" },
  { name: "story-queue", path: "/admin/stories", role: "editor" },
  { name: "editor", path: "/admin/editor", role: "editor" },
  { name: "business", path: "/admin/business", role: "super_admin" },
  { name: "search-console", path: "/admin/seo/search-console", role: "super_admin" },
  { name: "autonomous-seo", path: "/admin/seo/autonomous", role: "super_admin" },
  { name: "costs", path: "/admin/executive", role: "super_admin" },
  { name: "platform", path: "/admin/technical", role: "super_admin" },
  { name: "health", path: "/admin/health", role: "super_admin" },
  { name: "settings", path: "/admin/settings", role: "super_admin" },
];

test.describe("Phase 6 final screenshots", () => {
  test("capture core viewports and shell states", async ({ page, context }) => {
    test.setTimeout(420_000);
    await clearE2eDeskSession(page.request);
    await context.clearCookies();

    for (const [w, h] of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: h });

      await clearE2eDeskSession(page.request);
      await context.clearCookies();
      await page.goto("/admin/login", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible({
        timeout: 15_000,
      });
      await page.screenshot({
        path: path.join(SHOT, `login-${w}x${h}.png`),
        fullPage: false,
      });

      await authenticateAs(page, "super_admin");
      await page.goto("/admin/overview", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".av3-shell")).toBeVisible({ timeout: 30_000 });
      await page.locator(".av3-owner-summary").waitFor({
        state: "visible",
        timeout: 60_000,
      });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(SHOT, `command-centre-${w}x${h}.png`),
        fullPage: false,
      });

      if (w >= 1200) {
        await page.screenshot({
          path: path.join(SHOT, `sidebar-expanded-${w}x${h}.png`),
          fullPage: false,
        });
        const collapse = page.getByLabel(/collapse sidebar/i);
        if (await collapse.isVisible().catch(() => false)) {
          await collapse.click();
          await page.screenshot({
            path: path.join(SHOT, `sidebar-collapsed-${w}x${h}.png`),
            fullPage: false,
          });
          const expand = page.getByLabel(/expand sidebar/i);
          if (await expand.isVisible().catch(() => false)) {
            await expand.click();
          }
        }
      } else {
        const toggle = page.locator(".av3-mobile-toggle").first();
        if (await toggle.isVisible().catch(() => false)) {
          await toggle.click();
          await page
            .locator(".av3-sidebar--mobile-open")
            .waitFor({ state: "visible", timeout: 8_000 })
            .catch(() => null);
          await page.screenshot({
            path: path.join(SHOT, `mobile-drawer-${w}x${h}.png`),
            fullPage: false,
          });
          await page.keyboard.press("Escape");
        }
      }

      await authenticateAs(page, "editor");
      await page.goto("/admin/editorial", { waitUntil: "domcontentloaded" });
      await page.screenshot({
        path: path.join(SHOT, `editorial-${w}x${h}.png`),
        fullPage: false,
      });
      await page.goto("/admin/editor", { waitUntil: "domcontentloaded" });
      await page.screenshot({
        path: path.join(SHOT, `editor-${w}x${h}.png`),
        fullPage: false,
      });

      await authenticateAs(page, "super_admin");
      for (const route of ROUTES.filter((r) => r.role === "super_admin")) {
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await page.screenshot({
          path: path.join(SHOT, `${route.name}-${w}x${h}.png`),
          fullPage: false,
        });
      }
    }

    // Zoom validation at desktop via CSS zoom emulation
    await page.setViewportSize({ width: 1366, height: 768 });
    await authenticateAs(page, "super_admin");
    await page.goto("/admin/overview", { waitUntil: "domcontentloaded" });
    for (const zoom of [1.25, 1.5]) {
      await page.evaluate((z) => {
        document.documentElement.style.zoom = String(z);
      }, zoom);
      await page.screenshot({
        path: path.join(SHOT, `command-centre-zoom-${Math.round(zoom * 100)}.png`),
        fullPage: false,
      });
    }
    await page.evaluate(() => {
      document.documentElement.style.zoom = "1";
    });
  });
});
