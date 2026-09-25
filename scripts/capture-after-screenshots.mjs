import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const PATHS = [
  { name: "home", path: "/home" },
  { name: "latest", path: "/latest" },
  { name: "district-durg", path: "/district/durg" },
  { name: "district-raipur", path: "/district/raipur" },
  { name: "live", path: "/live" },
  { name: "story-durg-bhilai", path: "/story/durg-bhilai-drainage-modernization-municipal-corporation" },
];

const VIEWPORTS = [
  { label: "mobile-320", width: 320, height: 640 },
  { label: "mobile-375", width: 375, height: 667 },
  { label: "mobile-390", width: 390, height: 844 },
  { label: "desktop-1280", width: 1280, height: 800 },
  { label: "desktop-1440", width: 1440, height: 900 }
];

const OUT_DIR = path.resolve(process.cwd(), "qa", "reader-overhaul", "after");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  console.log(`Capturing after screenshots against ${BASE_URL}...`);
  const executablePath = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe";
  const browser = await chromium.launch({ executablePath, headless: true });
  
  for (const vp of VIEWPORTS) {
    console.log(`\n--- Capturing Viewport: ${vp.label} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.width < 768 
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    });

    await context.addInitScript(() => {
      try {
        localStorage.setItem("jd-ds-perm-notify-v1", "1");
        localStorage.setItem("jd-ds-perm-loc-v1", "1");
      } catch {}
    });

    const page = await context.newPage();

    for (const item of PATHS) {
      const url = `${BASE_URL}${item.path}`;
      const filename = `${item.name}-${vp.label}.png`;
      console.log(`Navigating to ${url} for ${filename}...`);
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(2000); // Allow styles and images to settle

        const outPath = path.join(OUT_DIR, filename);
        await page.screenshot({ path: outPath, fullPage: false });
        console.log(`Saved screenshot: ${filename}`);
      } catch (err) {
        console.error(`Failed to capture ${url} at ${vp.label}:`, err.message);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log("\nAfter screenshots completed successfully!");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
