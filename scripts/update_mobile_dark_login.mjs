import { chromium } from "playwright";

const PROD_URL = "https://www.jandarpan.news/login";
const ARTIFACT_DIR = "C:\\Users\\shriyansh chandrakar\\.gemini\\antigravity-ide\\brain\\030cd03b-74e5-4148-9230-61309a430039";

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    const page = await ctx.newPage();
    await page.goto(PROD_URL, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${ARTIFACT_DIR}/prod_login_gate_mobile_390px_dark.png` });
    console.log("Updated prod_login_gate_mobile_390px_dark.png successfully");
    await ctx.close();
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
