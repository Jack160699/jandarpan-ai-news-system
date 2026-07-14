import { expect, test } from "@playwright/test";
import { primeReaderSession, waitForReaderReady } from "./helpers/reader";

test("mobile homepage progressively reveals complete news sections", async ({ page }) => {
  await primeReaderSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForReaderReady(page);

  await expect(page.locator("body")).not.toHaveText("");
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  await expect(page.locator(".atlas-hero")).toBeVisible();

  const deepDive = page.locator(".atlas-deep-dive");
  await deepDive.scrollIntoViewIfNeeded();
  await expect(deepDive).toBeVisible();

  const topics = page.locator(".atlas-topic");
  const initialCount = await topics.count();
  expect(initialCount).toBeGreaterThanOrEqual(1);

  for (let pass = 0; pass < 8; pass += 1) {
    const sentinel = page.locator(".atlas-deep-dive__sentinel");
    if ((await sentinel.count()) === 0) break;
    await sentinel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
  }

  const finalCount = await topics.count();
  expect(finalCount).toBeGreaterThanOrEqual(initialCount);
  await expect(page.locator(".atlas-deep-dive__sentinel")).toHaveCount(0);

  const lastSectionLink = topics.last().locator('a[href^="/story/"]').first();
  await expect(lastSectionLink).toBeVisible();
  await lastSectionLink.click();
  await expect(page).toHaveURL(/\/story\//);
  await expect(page.locator("main article h1")).toBeVisible();
});
