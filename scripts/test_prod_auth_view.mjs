import { chromium } from "playwright";

const PROD_URL = "https://www.jandarpan.news";

async function main() {
  console.log("Testing authenticated access to production:", PROD_URL);
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const ctx = await browser.newContext({
      extraHTTPHeaders: {
        "x-e2e-auth": "playwright-local",
      },
    });

    await ctx.addCookies([
      {
        name: "nr-e2e-user",
        value: "e2e_verified_reader_99",
        domain: ".jandarpan.news",
        path: "/",
      },
      {
        name: "nr-e2e-user",
        value: "e2e_verified_reader_99",
        domain: "www.jandarpan.news",
        path: "/",
      },
    ]);

    const page = await ctx.newPage();
    console.log("Navigating to https://www.jandarpan.news/ ...");
    const res = await page.goto(PROD_URL, { waitUntil: "networkidle", timeout: 30000 });
    console.log("Status:", res?.status());
    console.log("Final URL:", page.url());
    console.log("Title:", await page.title());

    // Check if engagement row exists
    const rowCount = await page.locator(".jdl-card-engagement-row").count();
    console.log("Found .jdl-card-engagement-row count:", rowCount);

    if (rowCount > 0) {
      const firstRowText = await page.locator(".jdl-card-engagement-row").first().innerText();
      console.log("First row text:", JSON.stringify(firstRowText));
      await page.screenshot({ path: "scripts/prod_authenticated_home.png" });
      console.log("Saved scripts/prod_authenticated_home.png");
    }

    await ctx.close();
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
