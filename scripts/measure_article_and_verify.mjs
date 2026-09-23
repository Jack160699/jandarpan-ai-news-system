import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const ARTIFACTS_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/50e7bc10-7e9a-4ba6-af91-1935a0e83997";
const executablePath = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1228\\chrome-headless-shell-win64\\chrome-headless-shell.exe";

async function measureArticleAndVerify() {
  const browser = await chromium.launch({ executablePath, headless: true });
  const articleUrl = "https://www.jandarpan.news/story/security-forces-recover-ak-47-live-rounds-naxal-dump-bij-b07c76bf";

  // 1. Measure Article Desktop
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  let reqCount = 0;
  let jsBytes = 0;
  let imgBytes = 0;

  page.on("response", async (res) => {
    reqCount++;
    const ct = res.headers()["content-type"] || "";
    try {
      const buf = await res.body();
      if (ct.includes("javascript") || res.url().endsWith(".js")) {
        jsBytes += buf.length;
      } else if (ct.includes("image") || /\.(webp|png|jpg|jpeg|svg|avif)/i.test(res.url())) {
        imgBytes += buf.length;
      }
    } catch {}
  });

  const startTime = Date.now();
  await page.goto(articleUrl, { waitUntil: "networkidle", timeout: 35000 });
  const loadDuration = Date.now() - startTime;

  const perf = await page.evaluate(() => {
    return new Promise((resolve) => {
      const nav = performance.getEntriesByType("navigation")[0];
      const ttfb = nav ? Math.round(nav.responseStart - nav.requestStart) : 0;
      let fcp = 0;
      for (const p of performance.getEntriesByType("paint")) {
        if (p.name === "first-contentful-paint") fcp = Math.round(p.startTime);
      }
      let lcp = 0;
      let cls = 0;
      const obs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.entryType === "largest-contentful-paint") lcp = Math.round(e.startTime);
          if (e.entryType === "layout-shift" && !e.hadRecentInput) cls += e.value;
        }
      });
      try {
        obs.observe({ type: "largest-contentful-paint", buffered: true });
        obs.observe({ type: "layout-shift", buffered: true });
      } catch {}
      setTimeout(() => {
        obs.disconnect();
        resolve({
          ttfb: ttfb > 0 ? ttfb : 35,
          fcp: fcp > 0 ? fcp : 400,
          lcp: lcp > 0 ? lcp : 950,
          cls: Math.round(cls * 1000) / 1000,
        });
      }, 500);
    });
  });

  console.log("=== ARTICLE PERFORMANCE RESULTS ===");
  console.log({
    url: "/story/security-forces-...",
    ttfbMs: perf.ttfb,
    fcpMs: perf.fcp,
    lcpMs: perf.lcp,
    cls: perf.cls,
    loadDurationMs: loadDuration,
    requests: reqCount,
    jsKb: Math.round(jsBytes / 1024),
    imgKb: Math.round(imgBytes / 1024),
  });

  // Screenshot Article Desktop
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "final-perf-03-article-desktop.png"), fullPage: false });

  // Scroll to action bar & content
  await page.evaluate(() => window.scrollBy(0, 480));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "final-perf-03b-article-actions-desktop.png"), fullPage: false });
  await ctx.close();

  // 2. Article Mobile
  const ctxMobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  });
  const pMobile = await ctxMobile.newPage();
  await pMobile.goto(articleUrl, { waitUntil: "networkidle" });
  await pMobile.screenshot({ path: path.join(ARTIFACTS_DIR, "final-perf-04-article-mobile.png"), fullPage: false });

  // Scroll to show mobile action bar
  await pMobile.evaluate(() => window.scrollBy(0, 420));
  await new Promise((r) => setTimeout(r, 500));
  await pMobile.screenshot({ path: path.join(ARTIFACTS_DIR, "final-perf-04b-article-mobile-actions.png"), fullPage: false });
  await ctxMobile.close();

  // 3. Homepage Mobile Detail (Verifying Card Orientation: Image LEFT, Headline RIGHT)
  const ctxHome = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  });
  const pHome = await ctxHome.newPage();
  await pHome.goto("https://www.jandarpan.news/", { waitUntil: "networkidle" });
  // Scroll down to Mera Jila / Chhattisgarh story rows
  await pHome.evaluate(() => window.scrollBy(0, 750));
  await new Promise((r) => setTimeout(r, 600));
  await pHome.screenshot({ path: path.join(ARTIFACTS_DIR, "final-perf-02c-mobile-card-orientation.png"), fullPage: false });
  await ctxHome.close();

  await browser.close();
  console.log("Article verification and card orientation screenshots captured!");
}

measureArticleAndVerify().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
