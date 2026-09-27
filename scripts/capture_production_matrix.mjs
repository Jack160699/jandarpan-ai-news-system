import { chromium } from "playwright";

const PROD_URL = "https://www.jandarpan.news";
const ARTIFACT_DIR = "C:\\Users\\shriyansh chandrakar\\.gemini\\antigravity-ide\\brain\\030cd03b-74e5-4148-9230-61309a430039";

async function main() {
  console.log("=== CAPTURING PUBLIC PRODUCTION MATRIX TARGETING https://www.jandarpan.news ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    // 1. Desktop Light Hindi
    const ctxDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { "x-e2e-auth": "playwright-local" },
    });
    await ctxDesktop.addCookies([
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: ".jandarpan.news", path: "/" },
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: "www.jandarpan.news", path: "/" },
    ]);
    const pageDesktop = await ctxDesktop.newPage();
    await pageDesktop.goto(PROD_URL, { waitUntil: "networkidle", timeout: 35000 });
    await pageDesktop.waitForSelector(".jdl-card-engagement-row", { timeout: 15000 });
    await pageDesktop.screenshot({ path: `${ARTIFACT_DIR}/prod_matrix_01_desktop_light_hindi.png` });
    console.log("✓ Captured prod_matrix_01_desktop_light_hindi.png");

    // 2. Desktop Dark Hindi
    await pageDesktop.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
    });
    await pageDesktop.waitForTimeout(1000);
    await pageDesktop.screenshot({ path: `${ARTIFACT_DIR}/prod_matrix_02_desktop_dark_hindi.png` });
    console.log("✓ Captured prod_matrix_02_desktop_dark_hindi.png");

    // 3. Desktop Light English
    await pageDesktop.evaluate(() => {
      document.documentElement.removeAttribute("data-theme");
      document.documentElement.classList.remove("dark");
    });
    // Click EN button
    const enBtn = pageDesktop.locator('button:has-text("EN")');
    if (await enBtn.count() > 0) {
      await enBtn.first().click();
      await pageDesktop.waitForTimeout(2000);
    }
    await pageDesktop.screenshot({ path: `${ARTIFACT_DIR}/prod_matrix_03_desktop_light_english.png` });
    console.log("✓ Captured prod_matrix_03_desktop_light_english.png");
    await ctxDesktop.close();

    // 4. Mobile 390px Hindi
    const ctxMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      extraHTTPHeaders: { "x-e2e-auth": "playwright-local" },
    });
    await ctxMobile.addCookies([
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: ".jandarpan.news", path: "/" },
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: "www.jandarpan.news", path: "/" },
    ]);
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto(PROD_URL, { waitUntil: "networkidle", timeout: 35000 });
    await pageMobile.waitForSelector(".jdl-card-engagement-row", { timeout: 15000 });
    await pageMobile.screenshot({ path: `${ARTIFACT_DIR}/prod_matrix_04_mobile_390px_hindi.png` });
    console.log("✓ Captured prod_matrix_04_mobile_390px_hindi.png");

    // 5. Mobile 390px Dark
    await pageMobile.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
    });
    await pageMobile.waitForTimeout(1000);
    await pageMobile.screenshot({ path: `${ARTIFACT_DIR}/prod_matrix_05_mobile_390px_dark.png` });
    console.log("✓ Captured prod_matrix_05_mobile_390px_dark.png");
    await ctxMobile.close();

    console.log("All matrix screenshots captured successfully on public production domain!");
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
