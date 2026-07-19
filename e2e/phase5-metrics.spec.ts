import { expect, test } from "@playwright/test";
import { authenticateAs, clearE2eDeskSession } from "./helpers/auth";

test.describe("Phase 5 metrics", () => {
  test("daily vs health-summary + withhold", async ({ page, context }) => {
    await clearE2eDeskSession(page.request);
    await context.clearCookies();
    await authenticateAs(page, "super_admin");
    const dailyRes = await page.request.get("/api/admin/overview/daily");
    expect(dailyRes.ok()).toBeTruthy();
    const daily = await dailyRes.json();
    expect(daily.ok).toBe(true);
    const healthRes = await page.request.get("/api/admin/ops/health-summary");
    expect(healthRes.ok()).toBeTruthy();
    const health = await healthRes.json();
    expect(health.ok).toBe(true);
    const ds = daily.platform?.snapshot?.state;
    const hs = health.snapshot?.state ?? health.state;
    if (ds && hs) expect(ds).toBe(hs);
    await authenticateAs(page, "editor");
    const ed = await (await page.request.get("/api/admin/overview/daily")).json();
    expect(ed.costs).toBeUndefined();
  });

  test("KPI trust titles", async ({ page, context }) => {
    await clearE2eDeskSession(page.request);
    await context.clearCookies();
    await authenticateAs(page, "super_admin");
    await page.goto("/admin/overview", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".av3-metric[title]").first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
