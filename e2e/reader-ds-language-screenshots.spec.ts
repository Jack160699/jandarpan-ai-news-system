/**
 * Capture language-blocker visual evidence at 390×844 and 430×932.
 * Requires NEXT_PUBLIC_READER_DS=1 and a running server.
 */
import { expect, test } from "@playwright/test";
import path from "path";
import fs from "fs";

const FLAG = process.env.NEXT_PUBLIC_READER_DS === "1";
const OUT = path.join(
  "docs",
  "jandarpan-reader-redesign",
  "screenshots",
  "release-blockers",
  "language"
);

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
] as const;

async function setLang(page: import("@playwright/test").Page, lang: "hi" | "en") {
  await page.goto("/archive/language", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId(`lang-option-${lang}`)).toBeVisible({ timeout: 30_000 });
  await page.getByTestId(`lang-option-${lang}`).click();
  await page.getByTestId("lang-continue").click();
  await page.waitForURL(/\/archive/, { timeout: 20_000 });
}

async function shot(
  page: import("@playwright/test").Page,
  route: string,
  file: string
) {
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
}

test.describe("language blocker screenshots", () => {
  test.skip(!FLAG, "Requires NEXT_PUBLIC_READER_DS=1");
  test.setTimeout(360_000);

  test("capture Hindi/English primary chrome", async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await page.addInitScript(() => {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      await page.goto("/archive/language", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".jd-ds").first()).toBeVisible({ timeout: 45_000 });
      await page.screenshot({
        path: path.join(OUT, `d26-before-${vp.name}.png`),
        fullPage: false,
      });

      await setLang(page, "hi");
      await shot(page, "/", `home-hi-${vp.name}.png`);
      await shot(page, "/search", `search-hi-${vp.name}.png`);
      await shot(page, "/membership", `membership-hi-${vp.name}.png`);

      await page.goto("/", { waitUntil: "domcontentloaded" });
      const article = page.locator('a[href*="/story/"]').first();
      if ((await article.count()) > 0) {
        await article.click();
        await page.waitForTimeout(600);
        if ((await page.locator(".jd-ds").count()) > 0) {
          await page.screenshot({
            path: path.join(OUT, `article-hi-${vp.name}.png`),
            fullPage: false,
          });
        }
      }

      await setLang(page, "en");
      await page.goto("/archive/language", { waitUntil: "domcontentloaded" });
      await page.screenshot({
        path: path.join(OUT, `d26-after-en-${vp.name}.png`),
        fullPage: false,
      });

      await shot(page, "/", `home-en-${vp.name}.png`);
      await shot(page, "/search", `search-en-${vp.name}.png`);
      await shot(page, "/membership", `membership-en-${vp.name}.png`);

      await page.goto("/", { waitUntil: "domcontentloaded" });
      const articleEn = page.locator('a[href*="/story/"]').first();
      if ((await articleEn.count()) > 0) {
        await articleEn.click();
        await page.waitForTimeout(600);
        if ((await page.locator(".jd-ds").count()) > 0) {
          await page.screenshot({
            path: path.join(OUT, `article-en-chrome-${vp.name}.png`),
            fullPage: false,
          });
        }
      }
    }
  });
});
