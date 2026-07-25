import { expect, test } from "@playwright/test";

const FLAG = process.env.NEXT_PUBLIC_READER_DS === "1";

async function selectLanguageOption(
  page: import("@playwright/test").Page,
  id: "hi" | "en"
) {
  const option = page.getByTestId(`lang-option-${id}`);
  await expect(option).toBeVisible({ timeout: 30_000 });
  for (let attempt = 0; attempt < 3; attempt++) {
    await option.evaluate((el) => (el as HTMLButtonElement).click());
    try {
      await expect(option).toHaveAttribute("aria-pressed", "true", { timeout: 4_000 });
      return;
    } catch {
      /* retry — pointer interception can drop the first synthetic click */
    }
  }
  await expect(option).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });
}

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
    const nav = page.getByTestId("jd-bottom-nav").first();
    await expect(nav).toBeVisible({ timeout: 45_000 });
    await expect(nav.getByText("होम", { exact: true })).toBeVisible();
    await expect(nav.getByText("मेरा जिला", { exact: true })).toBeVisible();
    await expect(nav.getByText("ताज़ा", { exact: true })).toBeVisible();
    await expect(nav.getByText("सुनें", { exact: true })).toBeVisible();
    await expect(nav.getByText("वीडियो", { exact: true })).toHaveCount(0);
    await expect(nav).toHaveAttribute("data-jd-nav-count", "4");
    await expect(nav.getByText("Home", { exact: true })).toHaveCount(0);
    await expect(nav).toHaveAttribute("data-jd-locale", "hi");
    // Profile/More lives in the masthead after header-nav refinement.
    await expect(page.getByRole("link", { name: /प्रोफ़ाइल|Profile/i }).first()).toBeVisible();
  });

  test("D26 English selection updates chrome and persists after reload", async ({
    page,
  }) => {
    await page.goto("/archive/language", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("lang-option-en")).toBeVisible({ timeout: 30_000 });
    await selectLanguageOption(page, "en");
    await page.getByTestId("lang-continue").evaluate((el) => (el as HTMLButtonElement).click());
    await page.waitForURL(/\/archive/, { timeout: 15_000 });

    // Profile hub always mounts bottom nav (does not depend on homepage feed).
    const archiveNav = page.getByTestId("jd-bottom-nav").first();
    await expect(archiveNav).toBeVisible({ timeout: 45_000 });
    await expect(archiveNav).toHaveAttribute("data-jd-locale", "en", { timeout: 30_000 });
    await expect(archiveNav.getByText("Listen", { exact: true })).toBeVisible();
    await expect(archiveNav.getByText("Videos", { exact: true })).toHaveCount(0);
    await expect(archiveNav).toHaveAttribute("data-jd-nav-count", "4");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nav = page.getByTestId("jd-bottom-nav").first();
    await expect(nav).toBeVisible({ timeout: 45_000 });
    await expect(nav).toHaveAttribute("data-jd-locale", "en", { timeout: 30_000 });
    await expect(nav.getByText("Home", { exact: true })).toBeVisible();
    await expect(nav.getByText("My District", { exact: true })).toBeVisible();
    await expect(nav.getByText("Latest", { exact: true })).toBeVisible();
    await expect(nav.getByText("Listen", { exact: true })).toBeVisible();
    await expect(nav.getByText("Videos", { exact: true })).toHaveCount(0);
    await expect(nav.getByText("होम", { exact: true })).toHaveCount(0);
    await expect(nav.getByText("वीडियो", { exact: true })).toHaveCount(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(nav).toHaveAttribute("data-jd-locale", "en", { timeout: 30_000 });
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
    await selectLanguageOption(page, "en");
    await page.getByTestId("lang-continue").evaluate((el) => (el as HTMLButtonElement).click());
    await page.waitForURL(/\/archive/, { timeout: 15_000 });
    await expect(page.getByTestId("jd-bottom-nav").first()).toHaveAttribute("data-jd-locale", "en", {
      timeout: 30_000,
    });

    await page.goto("/archive/language", { waitUntil: "domcontentloaded" });
    await selectLanguageOption(page, "hi");
    await page.getByTestId("lang-continue").evaluate((el) => (el as HTMLButtonElement).click());
    await page.waitForURL(/\/archive/, { timeout: 15_000 });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nav = page.getByTestId("jd-bottom-nav").first();
    await expect(nav).toBeVisible({ timeout: 45_000 });
    await expect(nav).toHaveAttribute("data-jd-locale", "hi", { timeout: 30_000 });
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
