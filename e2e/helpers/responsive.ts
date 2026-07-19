import { expect, type Page } from "@playwright/test";

export async function assertNoHorizontalOverflow(page: Page, tolerance = 2) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + tolerance);
}

export async function assertOverlayInsideViewport(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  const vp = page.viewportSize();
  expect(vp).toBeTruthy();
  if (!vp) return;
  expect(box.x).toBeGreaterThanOrEqual(-2);
  expect(box.y).toBeGreaterThanOrEqual(-2);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 2);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 4);
}

export async function assertOneOverlayOpen(page: Page) {
  const openCount = await page.evaluate(() => {
    const selectors = [
      ".anr-drawer.is-open",
      ".anr-drawer[data-open='true']",
      ".anr-account-sheet",
      ".anr-status-sheet",
      ".anr-notify-sheet",
      "[data-admin-overlay='open']",
      ".anr-command-menu",
    ];
    return selectors.reduce((count, sel) => {
      const el = document.querySelector(sel);
      if (!el) return count;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return count;
      return count + 1;
    }, 0);
  });
  expect(openCount).toBeLessThanOrEqual(1);
}

export async function assertNoMobileCollapseControl(page: Page) {
  const width = page.viewportSize()?.width ?? 0;
  if (width >= 1024) return;
  await expect(page.getByLabel(/collapse sidebar/i)).toHaveCount(0);
}

export async function assertEditorInsideShell(page: Page) {
  const shell = page.locator(".av3-shell, .anr-shell, .anr-root").first();
  await expect(shell).toBeVisible({ timeout: 20_000 });
  const editor = page
    .locator(".av3-main, .anr-shell__content, .av3-editor, main")
    .first();
  await expect(editor).toBeVisible({ timeout: 20_000 });
  const nested = await page.evaluate(() => {
    const shellEl = document.querySelector(".av3-shell, .anr-shell, .anr-root");
    const content = document.querySelector(
      ".av3-main, .anr-shell__content, .av3-editor, [data-admin-editor], main"
    );
    if (!shellEl || !content) return false;
    return shellEl.contains(content);
  });
  expect(nested).toBe(true);
}
