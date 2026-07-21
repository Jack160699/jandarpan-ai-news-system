import { expect, test } from "@playwright/test";

const FLAG = process.env.NEXT_PUBLIC_READER_DS === "1";

test.describe("reader-ds homepage corrections (Agent 2)", () => {
  test.skip(!FLAG, "Requires NEXT_PUBLIC_READER_DS=1");

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    });
  });

  test("mobile masthead has no duplicate Search/Notify/Profile actions", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const mast = page.getByTestId("jd-masthead");
    await expect(mast).toBeVisible({ timeout: 30_000 });
    await expect(mast).toHaveAttribute("data-jd-masthead-actions", "none");
    await expect(mast.getByLabel("खोजें")).toHaveCount(0);
    await expect(mast.getByLabel("सूचनाएँ")).toHaveCount(0);
    await expect(mast.getByLabel("प्रोफ़ाइल")).toHaveCount(0);
    await expect(mast.locator('a[href="/notifications"]')).toHaveCount(0);
    await expect(mast.locator('a[href="/archive"]')).toHaveCount(0);

    // Reachable elsewhere: bottom nav More → /archive; Search & Notify on hub
    await expect(page.locator(".jd-bottom-nav a[href='/archive']")).toBeVisible();
    await page.goto("/archive", { waitUntil: "domcontentloaded" });
    await expect(page.locator('a[href="/search"]').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('a[href="/notifications"]').first()).toBeVisible();
  });

  test("breaking strip exposes live pulse class and full headline (no ellipsis clip)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const strip = page.getByTestId("jd-breaking-strip");
    const count = await strip.count();
    test.skip(count === 0, "No breaking item in current feed");

    await expect(strip.locator(".jd-breaking-strip__pulse")).toHaveCount(1);
    await expect(strip.locator(".jd-breaking-strip__label")).toContainText(/ब्रेकिंग|Breaking/i);
    const headline = strip.locator(".jd-breaking-strip__headline").first();
    await expect(headline).toBeVisible();
    const text = (await headline.innerText()).trim();
    expect(text.length).toBeGreaterThan(0);
    const overflow = await headline.evaluate((el) => {
      const s = getComputedStyle(el);
      return { textOverflow: s.textOverflow, whiteSpace: s.whiteSpace };
    });
    expect(overflow.textOverflow === "ellipsis" && overflow.whiteSpace === "nowrap").toBe(false);

    const link = strip.locator("a.jd-breaking-strip__item").first();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/story\//);
  });

  test("mandi is in lower utility, not desk rail; footer has safe area on phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jd-reader-ds")).toBeVisible({ timeout: 30_000 });

    const rail = page.locator('[data-jd-rail="editorial"]');
    await expect(rail.locator('[data-testid="jd-mandi-panel"]')).toHaveCount(0);

    const utility = page.getByTestId("jd-home-utility");
    await expect(utility).toBeVisible();
    await expect(utility.getByTestId("jd-mandi-panel")).toBeVisible();

    const footer = page.getByTestId("jd-desk-footer");
    await expect(footer).toBeVisible();
    await expect(footer.locator('a[href="/editorial-policy"]')).toBeVisible();
    await expect(footer.locator('a[href="/careers"]')).toHaveCount(0);

    const ending = page.getByTestId("jd-home-ending");
    await expect(ending).toBeVisible();

    // No horizontal overflow
    const overflowX = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflowX).toBe(false);

    // Footer is above bottom nav: scroll ending into view, then compare
    await ending.scrollIntoViewIfNeeded();
    await footer.scrollIntoViewIfNeeded();
    const footerBox = await footer.boundingBox();
    const navBox = await page.locator(".jd-bottom-nav").boundingBox();
    expect(footerBox && navBox).toBeTruthy();
    if (footerBox && navBox) {
      expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(navBox.y + 4);
    }
  });

  for (const size of [
    { w: 390, h: 844 },
    { w: 768, h: 1024 },
    { w: 1366, h: 768 },
    { w: 1440, h: 900 },
  ] as const) {
    test(`no horizontal overflow at ${size.w}x${size.h}`, async ({ page }) => {
      await page.setViewportSize({ width: size.w, height: size.h });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("jd-reader-ds")).toBeVisible({ timeout: 30_000 });
      const overflowX = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
      });
      expect(overflowX).toBe(false);
    });
  }
});
