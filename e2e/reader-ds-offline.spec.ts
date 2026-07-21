import { expect, test } from "@playwright/test";

const FLAG = process.env.NEXT_PUBLIC_READER_DS === "1";

test.describe("reader-ds offline downloads", () => {
  test.skip(!FLAG, "Requires NEXT_PUBLIC_READER_DS=1");

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    });
  });

  test("offline library and storage pages render", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/archive/offline", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jd-offline-library")).toBeVisible({ timeout: 30_000 });
    await page.goto("/archive/offline/storage", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jd-offline-storage")).toBeVisible({ timeout: 20_000 });
  });

  test("non-downloaded article shows not available offline", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/archive/offline/read/__missing-slug-offline__", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("jd-offline-unavailable")).toBeVisible({ timeout: 20_000 });
  });

  test("download → open offline reader under forced offline", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const story = page.locator('a[href^="/story/"]').first();
    await expect(story).toBeVisible({ timeout: 30_000 });
    const href = await story.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!, { waitUntil: "domcontentloaded" });
    const control = page.getByTestId("jd-offline-download");
    await expect(control).toBeVisible({ timeout: 30_000 });
    await control.getByRole("button", { name: /ऑफ़लाइन डाउनलोड|Download offline/i }).click();
    await expect(control.getByText(/डाउनलोड हो चुका|Downloaded/i)).toBeVisible({
      timeout: 30_000,
    });

    await page.evaluate(() => {
      document.documentElement.setAttribute("data-jd-force-offline", "1");
    });

    const openOffline = control.getByRole("link", { name: /ऑफ़लाइन पढ़ें|Read offline/i });
    await openOffline.click();
    await expect(page.getByTestId("jd-offline-mode-banner")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("jd-offline-reader")).toBeVisible();
  });

  test("Reader DS off redirects offline routes", async ({ page }) => {
    test.skip(FLAG, "This case needs NEXT_PUBLIC_READER_DS!=1");
  });
});

test.describe("reader-ds offline flag off", () => {
  test.skip(FLAG, "Requires NEXT_PUBLIC_READER_DS off");

  test("offline library redirects away when DS off", async ({ page }) => {
    await page.goto("/archive/offline", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/archive\/offline$/);
  });
});
