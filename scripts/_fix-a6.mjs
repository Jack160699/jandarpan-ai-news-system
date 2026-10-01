import { writeFile, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML = path.join(ROOT, "docs/jandarpan-reader-redesign/source-design/Jandarpan-Design-System.html.html");
const OUT = path.join(ROOT, "docs/jandarpan-reader-redesign/source-design/extracted/html");
const MAPPED = path.join(ROOT, "docs/jandarpan-reader-redesign/source-design/extracted/mapped");
await mkdir(OUT, { recursive: true });
await mkdir(MAPPED, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 }, deviceScaleFactor: 1 });
await page.goto("file:///" + HTML.replace(/\\/g, "/"), { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(5000);

const near = await page.evaluate(() => {
  // Find A6 text
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  let hit = null;
  while ((node = walker.nextNode())) {
    if ((node.nodeValue || "").trim() === "A6") {
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      hit = { x: r.x, y: r.y + window.scrollY };
      break;
    }
  }
  const boxes = [];
  for (const el of document.querySelectorAll("div")) {
    const r = el.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    const x = Math.round(r.x);
    const y = Math.round(r.y + window.scrollY);
    if (!hit) continue;
    if (Math.abs(x - hit.x) > 500) continue;
    if (y < hit.y - 40 || y > hit.y + 900) continue;
    if (w < 280 || h < 400) continue;
    boxes.push({ w, h, x, y, area: w * h });
  }
  boxes.sort((a, b) => a.y - b.y || b.area - a.area);
  // dedupe
  const seen = new Set();
  const uniq = [];
  for (const b of boxes) {
    const k = `${b.x}:${b.y}:${b.w}:${b.h}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(b);
  }
  return { hit, boxes: uniq.slice(0, 30) };
});

console.log(JSON.stringify(near, null, 2));
await writeFile(path.join(OUT, "a6-probe.json"), JSON.stringify(near, null, 2));

// Prefer phone-like nearest below A6 in same column (x ~ 1096)
const candidates = (near.boxes || []).filter((b) => b.w >= 350 && b.w <= 430 && b.h >= 600);
const pick =
  candidates.find((b) => Math.abs(b.x - (near.hit?.x || 1106)) < 80) ||
  candidates.sort((a, b) => Math.abs(a.x - 1106) - Math.abs(b.x - 1106))[0];

if (pick) {
  await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 40)), pick.y);
  await page.waitForTimeout(150);
  const sy = await page.evaluate(() => window.scrollY);
  const clip = { x: pick.x, y: Math.max(0, pick.y - sy), width: pick.w, height: Math.min(pick.h, 900) };
  await page.screenshot({ path: path.join(OUT, "A6.png"), clip });
  await copyFile(path.join(OUT, "A6.png"), path.join(MAPPED, "A6-approved.png"));
  console.log("recaptured A6", pick);
} else {
  console.log("no A6 candidate");
}
await browser.close();
