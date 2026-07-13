import { expect, test, type Page } from "@playwright/test";
import { primeReaderSession, waitForReaderReady } from "./helpers/reader";

const MOBILE_VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
] as const;

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    if (!doc) return false;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(overflow).toBe(false);
}

async function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

async function gotoCriticalRoute(page: Page, route: string) {
  try {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 200).toBeLessThan(500);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/ERR_ABORTED|NS_BINDING_ABORTED/i.test(message)) throw error;
  }
  await page.waitForLoadState("domcontentloaded");
  expect(page.url()).toMatch(/^http:\/\/localhost:3000\//);
  try {
    await assertNoHorizontalOverflow(page);
  } catch {
    await page.waitForLoadState("domcontentloaded");
    await assertNoHorizontalOverflow(page);
  }
}

test.describe("Atlas release journeys", () => {
  test.beforeEach(async ({ page }) => {
    await primeReaderSession(page);
  });

  test("homepage renders hero, feed, and bottom navigation", async ({ page }) => {
    const errors = await collectConsoleErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("main, #main-content").first()).toBeVisible({
      timeout: 30_000,
    });

    const storyLink = page.locator('a[href^="/story/"]').first();
    await expect(storyLink).toBeVisible({ timeout: 30_000 });

    const bottomNav = page.locator(
      'nav[aria-label*="Bottom"], nav.bottom-nav, [data-testid="bottom-nav"]'
    );
    if ((await bottomNav.count()) > 0) {
      await expect(bottomNav.first()).toBeVisible();
    }

    await assertNoHorizontalOverflow(page);
    expect(errors.filter((e) => !/favicon|404/.test(e))).toEqual([]);
  });

  test("homepage → story → back preserves scroll context", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForReaderReady(page);

    await page.evaluate(() => window.scrollTo(0, 480));
    await page.waitForTimeout(300);
    const scrollBefore = await page.evaluate(() => window.scrollY);

    const storyHref = await page
      .locator('a[href^="/story/"]')
      .first()
      .getAttribute("href");
    expect(storyHref).toBeTruthy();

    const storyLink = page.locator(`a[href="${storyHref}"]`).first();
    await storyLink.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL(/\/story\//, { timeout: 30_000 }),
      storyLink.click(),
    ]);

    await expect(
      page.locator(".atlas-story-page, .atlas-story-header, article").first()
    ).toBeVisible({ timeout: 20_000 });

    await page.locator(".atlas-story-header__back").click();
    await page.waitForURL(/\//, { timeout: 20_000 });
    await page.waitForFunction(
      (minY) => window.scrollY >= minY,
      Math.max(0, scrollBefore - 80),
      { timeout: 15_000 }
    );

    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBeGreaterThanOrEqual(Math.max(0, scrollBefore - 80));
  });

  test("story reader header actions are present", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForReaderReady(page);

    const storyHref = await page
      .locator('a[href^="/story/"]')
      .first()
      .getAttribute("href");
    expect(storyHref).toBeTruthy();
    await page.goto(storyHref!, { waitUntil: "domcontentloaded" });

    await expect(page.locator(".atlas-story-header").first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.locator('.atlas-story-header button[aria-label*="Back"], .atlas-story-header__back')
    ).toBeVisible();
    await expect(
      page
        .locator(".atlas-story-header")
        .getByRole("button", { name: /Share|शेयर/i })
        .first()
    ).toBeVisible();
  });

  test("critical routes respond", async ({ page }) => {
    const routes = ["/search", "/live", "/login", "/you", "/places"];
    for (const route of routes) {
      await gotoCriticalRoute(page, route);
    }
  });

  for (const viewport of MOBILE_VIEWPORTS) {
    test(`no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await assertNoHorizontalOverflow(page);

      const storyHref = await page
        .locator('a[href^="/story/"]')
        .first()
        .getAttribute("href");
      if (storyHref) {
        await page.goto(storyHref, { waitUntil: "domcontentloaded" });
        await assertNoHorizontalOverflow(page);
      }
    });
  }
});
