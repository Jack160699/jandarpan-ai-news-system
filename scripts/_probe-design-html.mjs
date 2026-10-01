import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML = path.join(ROOT, "docs/jandarpan-reader-redesign/source-design/Jandarpan-Design-System.html.html");
const OUT = path.join(ROOT, "docs/jandarpan-reader-redesign/source-design/extracted/html");

await mkdir(OUT, { recursive: true });
const t = await readFile(HTML, "utf8");
const mimeCounts = {};
for (const m of t.matchAll(/"mime":"([^"]+)"/g)) {
  mimeCounts[m[1]] = (mimeCounts[m[1]] || 0) + 1;
}
console.log("mimeCounts", mimeCounts);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on("console", (msg) => console.log("console", msg.type(), msg.text().slice(0, 200)));
page.on("pageerror", (e) => console.log("pageerror", String(e).slice(0, 300)));

const url = "file:///" + HTML.replace(/\\/g, "/");
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
for (const ms of [2000, 5000, 10000]) {
  await page.waitForTimeout(ms === 2000 ? 2000 : ms - (ms === 5000 ? 2000 : 5000));
  const info = await page.evaluate(() => ({
    title: document.title,
    bodyText: (document.body?.innerText || "").slice(0, 500),
    childCount: document.body?.children?.length || 0,
    htmlLen: document.documentElement?.outerHTML?.length || 0,
    hasXdc: !!document.querySelector("x-dc"),
    canvas: document.querySelectorAll("canvas").length,
    svg: document.querySelectorAll("svg").length,
    divs: document.querySelectorAll("div").length,
  }));
  console.log("t+" + ms, info);
  await page.screenshot({ path: path.join(OUT, `after-${ms}ms.png`), fullPage: false });
}
await page.screenshot({ path: path.join(OUT, "design-system-full.png"), fullPage: true });
await writeFile(path.join(OUT, "probe-meta.json"), JSON.stringify({ mimeCounts }, null, 2));
await browser.close();
