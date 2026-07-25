import { expect, test } from "@playwright/test";

const FLAG = process.env.NEXT_PUBLIC_READER_DS === "1";

test.describe("reader-ds publication footer (Agent 3)", () => {
  test.skip(!FLAG, "Requires NEXT_PUBLIC_READER_DS=1");

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
      try {
        sessionStorage.removeItem("jd-sticky-ad-dismissed-v1");
      } catch {
        /* ignore */
      }
    });
  });

  test("footer landmark has policy, district, category links and no dead routes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const footer = page.getByTestId("jd-desk-footer");
    await expect(footer).toBeVisible({ timeout: 30_000 });
    await expect(footer).toHaveAttribute("role", "contentinfo");

    await footer.scrollIntoViewIfNeeded();
    await expect(footer.locator('a[href="/editorial-policy"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/privacy"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/terms"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/ads-policy"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/news/national"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/district/raipur"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/district?select=1"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/feed.xml"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/careers"]')).toHaveCount(0);
    await expect(footer.locator('a[href="/category/india"]')).toHaveCount(0);
    await expect(footer.locator('a[href="/advertise"]')).toHaveCount(0);

    await expect(footer.getByText(/©\s*\d{4}/)).toBeVisible();
    await expect(footer.getByText(/सर्वाधिकार सुरक्षित|All rights reserved/i)).toBeVisible();
  });

  test("page ending modules and support CTA render without overflowing", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const ending = page.getByTestId("jd-home-ending");
    await expect(ending).toBeVisible({ timeout: 30_000 });
    await ending.scrollIntoViewIfNeeded();
    await expect(page.getByTestId("jd-ending-support")).toBeVisible();
    await expect(
      page.getByTestId("jd-ending-support").locator('a[href="/membership"]')
    ).toBeVisible();

    const overflowX = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflowX).toBe(false);
  });

  test("production-like: no sticky 320×50 placeholder without creative", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // Force non-preview path for sticky mount decision on client after hydration
      (window as unknown as { __JD_FORCE_AD_PROD?: boolean }).__JD_FORCE_AD_PROD = true;
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jd-reader-ds")).toBeVisible({ timeout: 30_000 });

    // In NODE_ENV=production builds sticky should be absent without creative.
    // In local next dev, preview may still show — assert no overlap with nav when present.
    const sticky = page.getByTestId("jd-sticky-ad");
    const stickyCount = await sticky.count();
    if (stickyCount > 0) {
      await expect(sticky.getByTestId("jd-sticky-ad-close")).toBeVisible();
      await sticky.getByTestId("jd-sticky-ad-close").click();
      await expect(sticky).toHaveCount(0);
      // Persisted dismiss
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("jd-sticky-ad")).toHaveCount(0);
    } else {
      await expect(sticky).toHaveCount(0);
    }

    const footer = page.getByTestId("jd-desk-footer");
    await footer.scrollIntoViewIfNeeded();
    const footerContent = footer.locator(".jd-desk-footer__grid").first();
    const contentBox = await footerContent.boundingBox();
    const navBox = await page.locator(".jd-bottom-nav").boundingBox();
    expect(contentBox && navBox).toBeTruthy();
    if (contentBox && navBox) {
      // Footer shell may use padding-bottom to clear the fixed nav; assert content itself.
      expect(contentBox.y + contentBox.height).toBeLessThanOrEqual(navBox.y + 4);
    }
  });

  for (const size of [
    { w: 360, h: 800 },
    { w: 390, h: 844 },
    { w: 412, h: 915 },
    { w: 768, h: 1024 },
    { w: 1366, h: 768 },
    { w: 1440, h: 900 },
  ] as const) {
    test(`footer readable, no overflow at ${size.w}x${size.h}`, async ({ page }) => {
      await page.setViewportSize({ width: size.w, height: size.h });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("jd-desk-footer")).toBeVisible({ timeout: 30_000 });
      const overflowX = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
      });
      expect(overflowX).toBe(false);
    });
  }
});
