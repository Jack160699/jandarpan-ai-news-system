import { expect, test } from "@playwright/test";

/**
 * Hindi typography / glyph-clipping checks for Reader DS.
 * Run: NEXT_PUBLIC_READER_DS=1 npx playwright test e2e/reader-ds-hindi-typography.spec.ts
 */
const FLAG = process.env.NEXT_PUBLIC_READER_DS === "1";

const VIEWPORTS = [
  { name: "360x800", width: 360, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "412x915", width: 412, height: 915 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1440x900", width: 1440, height: 900 },
] as const;

async function dismissPerms(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("jd-ds-perm-notify-v1", "1");
    localStorage.setItem("jd-ds-perm-loc-v1", "1");
  });
}

test.describe("reader-ds Hindi typography", () => {
  test.skip(!FLAG, "Requires NEXT_PUBLIC_READER_DS=1");

  test.beforeEach(async ({ page }) => {
    await dismissPerms(page);
  });

  test("key labels have safe line-height and no vertical crop", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 45_000 });

    const report = await page.evaluate(() => {
      const pick = (sel: string) => document.querySelector(sel) as HTMLElement | null;
      const measure = (el: HTMLElement | null) => {
        if (!el) return null;
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const lh = parseFloat(cs.lineHeight);
        const fs = parseFloat(cs.fontSize);
        const ratio = Number.isFinite(lh) && fs > 0 ? lh / fs : NaN;
        return {
          fontSize: fs,
          lineHeight: lh,
          ratio,
          height: rect.height,
          overflowY: cs.overflowY,
          text: (el.textContent || "").trim().slice(0, 80),
        };
      };

      return {
        masthead: measure(pick(".jd-type-masthead, .jd-masthead .jd-brand")),
        breakingLabel: measure(pick(".jd-breaking-strip__label")),
        breakingHeadline: measure(pick(".jd-breaking-strip__headline")),
        lead: measure(pick(".jd-lead-title")),
        meta: measure(pick(".jd-type-meta")),
        nav: measure(pick(".jd-bottom-nav .jd-type-nav")),
        bodyOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });

    expect(report.masthead?.ratio ?? 0).toBeGreaterThanOrEqual(1.3);
    expect(report.breakingLabel?.ratio ?? 0).toBeGreaterThanOrEqual(1.3);
    expect(report.breakingHeadline?.ratio ?? 0).toBeGreaterThanOrEqual(1.35);
    if (report.lead) {
      expect(report.lead.fontSize).toBeGreaterThanOrEqual(26);
      expect(report.lead.ratio).toBeGreaterThanOrEqual(1.3);
    }
    if (report.meta) {
      expect(report.meta.fontSize).toBeGreaterThanOrEqual(12.5);
    }
    if (report.nav) {
      expect(report.nav.fontSize).toBeGreaterThanOrEqual(11.5);
      expect(report.nav.ratio).toBeGreaterThanOrEqual(1.3);
    }
    expect(report.bodyOverflowX).toBe(false);
  });

  test("125% text scaling keeps masthead and breaking glyphs visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 45_000 });

    await page.addStyleTag({
      content: "html { font-size: 125% !important; }",
    });

    const strip = page.getByTestId("jd-breaking-strip");
    if (await strip.count()) {
      const box = await strip.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(36);
      const label = strip.locator(".jd-breaking-strip__label");
      await expect(label).toBeVisible();
      const labelBox = await label.boundingBox();
      expect(labelBox?.height ?? 0).toBeGreaterThanOrEqual(14);
    }

    const nav = page.locator(".jd-bottom-nav .jd-type-nav").first();
    if (await nav.count()) {
      await expect(nav).toBeVisible();
    }
  });

  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 45_000 });

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        };
      });
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
    });
  }
});
