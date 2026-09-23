import { chromium } from "playwright";

const executablePath = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1228\\chrome-headless-shell-win64\\chrome-headless-shell.exe";

async function audit() {
  const browser = await chromium.launch({ executablePath, headless: true });
  
  // Audit Mobile 375x812 (Highest Priority)
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
  const resources = [];

  page.on("response", async (res) => {
    try {
      const req = res.request();
      const url = req.url();
      const type = req.resourceType();
      const status = res.status();
      const headers = res.headers();
      const contentLength = parseInt(headers["content-length"] || "0", 10);
      let bodySize = contentLength;
      if (!bodySize) {
        try {
          const buf = await res.body();
          bodySize = buf.length;
        } catch {}
      }
      resources.push({ url, type, status, size: bodySize });
    } catch {}
  });

  console.log("Navigating to https://www.jandarpan.news/ (Mobile 375)...");
  await page.goto("https://www.jandarpan.news/", { waitUntil: "networkidle" });

  const jsResources = resources.filter(r => r.type === "script" || r.url.endsWith(".js") || r.url.includes("/_next/static/chunks/"));
  const imgResources = resources.filter(r => r.type === "image" || /\.(png|jpg|jpeg|webp|avif|gif|svg)/i.test(r.url));
  const fetchResources = resources.filter(r => r.type === "fetch" || r.type === "xhr");

  console.log("\n--- MOBILE 375 RESOURCE AUDIT ---");
  console.log(`Total Requests: ${resources.length}`);
  console.log(`JS Requests: ${jsResources.length}, Total JS Size: ${(jsResources.reduce((a, b) => a + b.size, 0) / 1024).toFixed(1)} KB`);
  console.log(`Image Requests: ${imgResources.length}, Total Image Size: ${(imgResources.reduce((a, b) => a + b.size, 0) / 1024).toFixed(1)} KB`);
  console.log(`Fetch/XHR Requests: ${fetchResources.length}, Total Fetch Size: ${(fetchResources.reduce((a, b) => a + b.size, 0) / 1024).toFixed(1)} KB`);

  console.log("\nTop 15 Largest JS Chunks:");
  jsResources.sort((a, b) => b.size - a.size).slice(0, 15).forEach((r) => {
    const name = r.url.split("/").pop().split("?")[0];
    console.log(`  ${(r.size / 1024).toFixed(1)} KB : ${name} (${r.url.slice(0, 80)})`);
  });

  console.log("\nTop 15 Largest Images:");
  imgResources.sort((a, b) => b.size - a.size).slice(0, 15).forEach((r) => {
    const name = r.url.split("/").pop().split("?")[0];
    console.log(`  ${(r.size / 1024).toFixed(1)} KB : ${name} (${r.url.slice(0, 80)})`);
  });

  console.log("\n--- BREAKDOWN BY RESOURCE TYPE ---");
  const byType = {};
  resources.forEach(r => {
    byType[r.type] = (byType[r.type] || 0) + 1;
  });
  console.log(byType);

  console.log("\nAll Fonts Requested:");
  resources.filter(r => r.type === "font" || r.url.includes(".woff")).forEach(r => {
    console.log(`  Font (${(r.size/1024).toFixed(1)} KB): ${r.url}`);
  });

  console.log("\nAll Fetch / XHR / RSC Requested:");
  fetchResources.forEach(r => {
    console.log(`  Fetch (${(r.size/1024).toFixed(1)} KB) [${r.status}]: ${r.url}`);
  });

  await browser.close();
}

audit().catch(console.error);
