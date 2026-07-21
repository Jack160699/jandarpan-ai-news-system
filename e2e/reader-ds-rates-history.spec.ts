import { expect, test } from "@playwright/test";

test.describe("verified rates history SEO pages", () => {
  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet-portrait", width: 768, height: 1024 },
    { name: "tablet-landscape", width: 1024, height: 768 },
    { name: "desktop", width: 1280, height: 800 },
  ] as const) {
    test(`Raipur petrol honest states @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/rates/chhattisgarh/raipur/petrol-price-today", {
        waitUntil: "domcontentloaded",
      });
      await expect(page.locator("h1")).toContainText(/पेट्रोल|रायपुर/);
      await expect(page.locator("[data-jd-rate-page='petrol']")).toBeVisible();
      await expect(page.getByText(/\bLive\b|₹0(?!\d)/i)).toHaveCount(0);
      const body = await page.locator("body").innerText();
      expect(body).not.toMatch(/\bofficial\b/i);
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
      });
      expect(overflow).toBe(false);
    });
  }

  test("gold page is state-level not city-fake", async ({ page }) => {
    await page.goto("/rates/chhattisgarh/gold-price-today", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("h1")).toContainText(/सोना/);
    await expect(page.getByText(/शहर-विशेष आधिकारिक/)).toBeVisible();
  });

  test("unsupported fuel city 404s", async ({ page }) => {
    const res = await page.goto("/rates/chhattisgarh/mumbai/petrol-price-today", {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status()).toBe(404);
  });

  test("sitemap-rates.xml excludes admin/api", async ({ request }) => {
    const res = await request.get("/sitemap-rates.xml");
    expect(res.ok()).toBeTruthy();
    const xml = await res.text();
    expect(xml).toContain("/rates/chhattisgarh/raipur/petrol-price-today");
    expect(xml).not.toContain("/admin/");
    expect(xml).not.toContain("/api/");
  });

  test("rates hub internal links", async ({ page }) => {
    await page.goto("/rates", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /छत्तीसगढ़ दरें/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /पद्धति/ })).toBeVisible();
  });
});
