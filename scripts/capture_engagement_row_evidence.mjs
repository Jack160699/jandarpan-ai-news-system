import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:3000";
const ARTIFACT_DIR = "C:\\Users\\shriyansh chandrakar\\.gemini\\antigravity-ide\\brain\\030cd03b-74e5-4148-9230-61309a430039";

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    // 1. Desktop Light (Hindi)
    const ctxDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { "x-e2e-auth": "playwright-local" },
    });
    await ctxDesktop.addCookies([
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: "127.0.0.1", path: "/" },
    ]);
    const pageDesktop = await ctxDesktop.newPage();
    await pageDesktop.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await pageDesktop.waitForSelector(".jdl-card-engagement-row", { timeout: 15000 });
    await pageDesktop.screenshot({ path: `${ARTIFACT_DIR}/engagement_5item_desktop_light.png` });
    console.log("Captured desktop light screenshot.");

    // 2. Desktop Dark
    await pageDesktop.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await pageDesktop.waitForTimeout(1000);
    await pageDesktop.screenshot({ path: `${ARTIFACT_DIR}/engagement_5item_desktop_dark.png` });
    console.log("Captured desktop dark screenshot.");
    await ctxDesktop.close();

    // 3. Mobile 390px (Hindi Light)
    const ctxMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      extraHTTPHeaders: { "x-e2e-auth": "playwright-local" },
    });
    await ctxMobile.addCookies([
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: "127.0.0.1", path: "/" },
    ]);
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await pageMobile.waitForSelector(".jdl-card-engagement-row", { timeout: 15000 });
    await pageMobile.screenshot({ path: `${ARTIFACT_DIR}/engagement_5item_mobile_390px.png` });
    console.log("Captured mobile 390px screenshot.");

    // 4. Mobile 390px Dark
    await pageMobile.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await pageMobile.waitForTimeout(1000);
    await pageMobile.screenshot({ path: `${ARTIFACT_DIR}/engagement_5item_mobile_390px_dark.png` });
    console.log("Captured mobile 390px dark screenshot.");
    await ctxMobile.close();

    // 5. English Mode Desktop
    const ctxEn = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { "x-e2e-auth": "playwright-local" },
    });
    await ctxEn.addCookies([
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: "127.0.0.1", path: "/" },
      { name: "jd_reader_lang", value: "en", domain: "127.0.0.1", path: "/" },
    ]);
    const pageEn = await ctxEn.newPage();
    await pageEn.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await pageEn.waitForSelector(".jdl-card-engagement-row", { timeout: 15000 });
    await pageEn.screenshot({ path: `${ARTIFACT_DIR}/engagement_5item_desktop_english.png` });
    console.log("Captured English mode screenshot.");
    await ctxEn.close();

  } finally {
    await browser.close();
  }
}

capture().catch(console.error);
