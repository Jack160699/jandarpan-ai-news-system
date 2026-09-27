import { chromium } from "playwright";

const PROD_URL = "https://www.jandarpan.news";

async function verifyGA4() {
  console.log("=== VERIFYING GA4 TELEMETRY ON PUBLIC PRODUCTION ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    const gaRequests = [];
    page.on("request", (req) => {
      const url = req.url();
      if (
        url.includes("google-analytics.com") ||
        url.includes("googletagmanager.com/gtag/js") ||
        url.includes("analytics.google.com")
      ) {
        gaRequests.push({
          url,
          method: req.method(),
        });
      }
    });

    console.log(`Navigating to ${PROD_URL} ...`);
    await page.goto(PROD_URL, { waitUntil: "networkidle", timeout: 35000 });
    await page.waitForTimeout(4000);

    const dataLayer = await page.evaluate(() => {
      return window.dataLayer || [];
    });

    console.log(`Captured GA network requests count: ${gaRequests.length}`);
    gaRequests.forEach((r, i) => console.log(` [${i + 1}] ${r.method} ${r.url.slice(0, 150)}...`));

    const gtmRequest = gaRequests.find((r) => r.url.includes("G-C2E2992MCL"));
    const collectRequest = gaRequests.find(
      (r) => r.url.includes("collect") && (r.url.includes("tid=G-C2E2992MCL") || r.url.includes("G-C2E2992MCL"))
    );

    console.log("\nGA4 Verification Results:");
    console.log("- GTM Script Loaded with G-C2E2992MCL:", !!gtmRequest);
    console.log("- Collect Hit Dispatched for G-C2E2992MCL:", !!collectRequest);
    console.log("- dataLayer Present:", Array.isArray(dataLayer) && dataLayer.length > 0);
    console.log("- dataLayer contents:", JSON.stringify(dataLayer));

    await ctx.close();
    return {
      gtmLoaded: !!gtmRequest,
      collectHitDispatched: !!collectRequest,
      dataLayerCount: dataLayer.length,
      gaRequests,
    };
  } finally {
    await browser.close();
  }
}

verifyGA4().then((res) => {
  console.log("\nSummary:", res.gtmLoaded && (res.collectHitDispatched || res.dataLayerCount > 0) ? "GA4 TELEMETRY PASS" : "GA4 TELEMETRY FAIL");
}).catch(console.error);
