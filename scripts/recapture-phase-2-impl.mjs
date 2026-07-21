import { chromium } from "@playwright/test";
import { copyFile } from "node:fs/promises";
import path from "node:path";

const OUT = "docs/jandarpan-reader-redesign/screenshots/phase-2";
const APP = "http://127.0.0.1:3000";

const SCREENS = [
  ["a10-district-selector", "/district?select=1"],
  ["a2-district-home", "/district/raipur"],
  ["a3-category", "/category/politics"],
  ["a4-latest", "/latest"],
  ["a5-trending", "/trending"],
  ["a6-search-overlay", "/search"],
  ["a7-search-results", `/search?q=${encodeURIComponent("विधानसभा")}`],
  ["a8-topic", "/topics/chhattisgarh-assembly"],
  ["a9-live", "/live"],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "hi-IN" });

for (const [id, route] of SCREENS) {
  await page.goto(`${APP}${route}`, { waitUntil: "networkidle", timeout: 60000 });
  if (id === "a6-search-overlay") {
    await page.locator('[role="dialog"][aria-label="खोज"]').waitFor({ state: "visible", timeout: 10000 });
  } else {
    await page.waitForTimeout(600);
  }
  const mastBg = await page.evaluate(() => {
    const mast = document.querySelector(".jd-masthead");
    return mast ? getComputedStyle(mast).backgroundColor : "none";
  });
  const impl = path.join(OUT, `${id}-implementation.png`);
  const fin = path.join(OUT, `${id}-corrected-final.png`);
  await page.screenshot({ path: impl, fullPage: false });
  await copyFile(impl, fin);
  console.log(id, mastBg);
}

await browser.close();
console.log("done");
