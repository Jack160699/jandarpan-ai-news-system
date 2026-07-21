import { expect, test } from "@playwright/test";

const FLAG = process.env.NEXT_PUBLIC_READER_DS === "1";

/** Lightweight a11y gates without axe dependency — landmarks, labels, focus. */
test.describe("reader-ds accessibility (Phase 7)", () => {
  test.skip(!FLAG, "Requires NEXT_PUBLIC_READER_DS=1");

  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.title.includes("permission")) return;
    await page.addInitScript(() => {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    });
  });

  test("main landmark and skip-friendly structure", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main#main-content, main[role='main']").first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("bottom nav buttons are named", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nav = page.locator(".jd-bottom-nav");
    await expect(nav).toBeVisible({ timeout: 30_000 });
    const buttons = nav.locator("a, button");
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < count; i++) {
      const el = buttons.nth(i);
      const name = ((await el.getAttribute("aria-label")) || (await el.innerText())).trim();
      expect(name.length).toBeGreaterThan(0);
    }
  });

  test("error state exposes retry control", async ({ page }) => {
    await page.goto("/system/preview?state=error", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /फिर कोशिश|Try again|पुनः प्रयास/ })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("permission dialog is labelled", async ({ page }) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      localStorage.removeItem("jd-ds-perm-notify-v1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    });
    await page.goto("/system/preview?state=notify", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /ब्रेकिंग/ })).toBeVisible({ timeout: 15_000 });
  });
});

