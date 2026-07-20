import { expect, test } from "@playwright/test";

const FLAG = process.env.NEXT_PUBLIC_READER_DS === "1";

/**
 * Release blocker #3 — language switching across Reader DS chrome.
 * Asserts Hindi default, English switch + persistence, return to Hindi,
 * and no mixed primary nav chrome. Does not assert CMS article body language.
 */
test.describe("reader-ds language switching (blocker #3)", () => {
  test.skip(!FLAG, "Requires NEXT_PUBLIC_READER_DS=1");
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    });
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("defaults to Hindi chrome on first visit", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nav = page.locator(".jd-bottom-nav");
    await expect(nav).toBeVisible({ timeout: 45_000 });
    await expect(nav.getByText("होम", { exact: true })).toBeVisible();
    await expect(nav.getByText("अधिक", { exact: true })).toBeVisible();
    await expect(nav.getByText("Home", { exact: true })).toHaveCount(0);
    await expect(nav).toHaveAttribute("data-jd-locale", "hi");
  });

  test("D26 English selection updates chrome and persists after reload", async ({
    page,
  }) => {
    await page.goto("/archive/language", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("lang-option-en")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("lang-option-en").click();
    await page.getByTestId("lang-continue").click();
    await page.waitForURL(/\/archive/, { timeout: 15_000 });

    // Profile hub always mounts bottom nav (does not depend on homepage feed).
    await expect(page.locator(".jd-bottom-nav")).toBeVisible({ timeout: 45_000 });
    await expect(page.locator(".jd-bottom-nav")).toHaveAttribute("data-jd-locale", "en");
    await expect(page.locator(".jd-bottom-nav").getByText("More", { exact: true })).toBeVisible();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nav = page.locator(".jd-bottom-nav");
    await expect(nav).toBeVisible({ timeout: 45_000 });
    await expect(nav).toHaveAttribute("data-jd-locale", "en");
    await expect(nav.getByText("Home", { exact: true })).toBeVisible();
    await expect(nav.getByText("More", { exact: true })).toBeVisible();
    await expect(nav.getByText("होम", { exact: true })).toHaveCount(0);
    await expect(nav.getByText("अधिक", { exact: true })).toHaveCount(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(nav).toHaveAttribute("data-jd-locale", "en");
    await expect(nav.getByText("Home", { exact: true })).toBeVisible();

    await page.goto("/search", { waitUntil: "domcontentloaded" });
    await expect(page.getByPlaceholder(/Search/i)).toBeVisible({ timeout: 30_000 });

    await page.goto("/membership", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Darpan Premium|Membership|Try/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("switching back to Hindi restores Hindi chrome", async ({ page }) => {
    await page.goto("/archive/language", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("lang-option-en")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("lang-option-en").click();
    await page.getByTestId("lang-continue").click();

    await page.goto("/archive/language", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("lang-option-hi")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("lang-option-hi").click();
    await page.getByTestId("lang-continue").click();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nav = page.locator(".jd-bottom-nav");
    await expect(nav).toBeVisible({ timeout: 45_000 });
    await expect(nav).toHaveAttribute("data-jd-locale", "hi");
    await expect(nav.getByText("होम", { exact: true })).toBeVisible();
    await expect(nav.getByText("Home", { exact: true })).toHaveCount(0);
  });

  test("no hydration error when language cookie is English", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.context().addCookies([
      {
        name: "cgb-language",
        value: "en",
        domain: "127.0.0.1",
        path: "/",
      },
      {
        name: "cgb-language-chosen",
        value: "1",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.addInitScript(() => {
      localStorage.setItem("cgb-language", "en");
      localStorage.setItem("jd-language", "en");
      localStorage.setItem("cgb-language-chosen", "1");
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-bottom-nav")).toBeVisible({ timeout: 45_000 });
    await expect(page.locator(".jd-bottom-nav")).toHaveAttribute("data-jd-locale", "en");

    const hydration = errors.filter(
      (e) =>
        /hydrat/i.test(e) ||
        /Text content did not match/i.test(e) ||
        /Minified React error #418/i.test(e) ||
        /Minified React error #423/i.test(e)
    );
    expect(hydration).toEqual([]);
  });
});
