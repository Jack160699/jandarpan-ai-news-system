import { chromium } from "playwright";

const executablePath = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1228\\chrome-headless-shell-win64\\chrome-headless-shell.exe";

async function auditFetch() {
  const browser = await chromium.launch({ executablePath, headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    } catch {}
  });

  const page = await ctx.newPage();
  const fetchReqs = [];

  page.on("request", (req) => {
    const type = req.resourceType();
    if (type === "fetch" || type === "xhr") {
      fetchReqs.push({
        url: req.url(),
        method: req.method(),
      });
    }
  });

  console.log("Navigating to https://www.jandarpan.news/ (Mobile 375)...");
  await page.goto("https://www.jandarpan.news/", { waitUntil: "networkidle" });

  console.log(`\nFound ${fetchReqs.length} Fetch/XHR requests:`);
  fetchReqs.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.method}] ${r.url}`);
  });

  await browser.close();
}

auditFetch().catch(console.error);
