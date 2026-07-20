import { expect, test } from "@playwright/test";

const FLAG = process.env.NEXT_PUBLIC_READER_DS === "1";

test.describe("reader-ds mandi rates", () => {
  test.skip(!FLAG, "Requires NEXT_PUBLIC_READER_DS=1");

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    });
  });

  test("available mandi panel shows modal, unit, source, no fake %", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/weather**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          status: "ok",
          district: "raipur",
          locationEn: "Raipur",
          locationHi: "रायपुर",
          tempC: 31,
          conditionHi: "साफ़",
          conditionEn: "Clear",
          isDay: true,
          weatherCode: 0,
          source: "open-meteo",
          fetchedAt: new Date().toISOString(),
          stale: false,
        }),
      });
    });
    await page.route("**/api/utilities/mandi**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "available",
          location: "रायपुर",
          reportedAt: "20/07/2026",
          fetchedAt: new Date().toISOString(),
          freshness: "recent",
          source: { name: "AGMARKNET / data.gov.in" },
          rates: [
            {
              commodity: "धान",
              providerCommodity: "Paddy(Dhan)(Common)",
              variety: "Common",
              market: "Raipur",
              district: "Raipur",
              state: "Chhattisgarh",
              modalPrice: 2300,
              minPrice: 2200,
              maxPrice: 2400,
              unit: "₹/क्विंटल",
              reportedAt: "20/07/2026",
              freshness: "recent",
            },
          ],
        }),
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const panel = page.locator('[data-testid="jd-mandi-panel"]:visible').first();
    await expect(panel).toBeVisible({ timeout: 30_000 });
    await expect(panel).toHaveAttribute("data-jd-mandi", "available");
    await expect(panel).toContainText("हालिया मंडी भाव");
    await expect(panel).toContainText("धान");
    await expect(panel).toContainText("क्विंटल");
    await expect(panel).toContainText("AGMARKNET");
    await expect(panel).not.toContainText(/%/);
    await expect(panel).not.toContainText(/Live|लाइव/i);
    await expect(page.locator(".jd-utility-row").first()).toContainText("31°");
    await expect(page.getByText(/सोना 24K|Gold 24K/)).toHaveCount(0);
    await expect(page.getByText(/Sensex|Nifty|डीज़ल|Diesel/)).toHaveCount(0);
  });

  test("unavailable mandi does not invent prices; weather remains", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/weather**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          status: "ok",
          district: "raipur",
          tempC: 28,
          conditionHi: "बादल",
          conditionEn: "Clouds",
          isDay: true,
          weatherCode: 2,
          source: "open-meteo",
          fetchedAt: new Date().toISOString(),
          stale: false,
        }),
      });
    });
    await page.route("**/api/utilities/mandi**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "unavailable",
          reason: "missing_api_key",
          fetchedAt: new Date().toISOString(),
          source: { name: "AGMARKNET / data.gov.in" },
          rates: [],
        }),
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="jd-mandi-panel"]:visible').first()).toHaveAttribute(
      "data-jd-mandi",
      "unavailable",
      { timeout: 30_000 }
    );
    await expect(page.getByTestId("jd-mandi-rate")).toHaveCount(0);
    await expect(page.locator(".jd-utility-row").first()).toContainText("28°");
    await expect(page.locator(".jd-util-tiles")).toHaveCount(0);
  });
});
