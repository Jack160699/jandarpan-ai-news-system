import type { Page } from "@playwright/test";

/** Prime reader language so Atlas journeys skip the first-visit language gate. */
export async function primeReaderSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("cgb-language", "hi");
    localStorage.setItem("cgb-language-chosen", "1");
    document.cookie = "cgb-language-chosen=1; path=/; SameSite=Lax";
    document.documentElement.removeAttribute("data-lang-gate");
  });
}

/** Dismiss the language gate when it appears; no-op when already primed. */
export async function waitForReaderReady(page: Page) {
  const gate = page.locator(".lang-gate--visible");
  const visible = await gate.isVisible().catch(() => false);
  if (!visible) return;

  await page.locator("#lang-gate-legal-checkbox").check();
  await page.getByRole("button", { name: /^Continue$/i }).click();
  await gate.waitFor({ state: "hidden", timeout: 15_000 });
}
