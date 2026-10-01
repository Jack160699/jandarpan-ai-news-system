/**
 * Locate exact screen-id text nodes (A1…F54) and capture nearest phone artboard below each.
 */
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML = path.join(ROOT, "docs/jandarpan-reader-redesign/source-design/Jandarpan-Design-System.html.html");
const OUT = path.join(ROOT, "docs/jandarpan-reader-redesign/source-design/extracted/html");
const MAPPED = path.join(ROOT, "docs/jandarpan-reader-redesign/source-design/extracted/mapped");

const IDS = [
  "A1","A2","A3","A4","A5","A6","A7","A8","A9","A10",
  "B11","B12","B13","B14","B15","B16","B17","B18","B19","B20",
  "C21","C22","C23","C24","C25",
  "D26","D27","D28","D29","D30","D31","D32","D33","D34","D35",
  "E36","E37","E38","E39","E40","E41","E42","E43","E44","E45",
  "F46","F47","F48","F49","F50","F51","F52","F53","F54",
];

await mkdir(OUT, { recursive: true });
await mkdir(MAPPED, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 }, deviceScaleFactor: 1 });
await page.goto("file:///" + HTML.replace(/\\/g, "/"), { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(6000);

const located = await page.evaluate((ids) => {
  const idSet = new Set(ids);
  const idHits = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const t = (node.nodeValue || "").replace(/\s+/g, " ").trim();
    if (!idSet.has(t)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    // Prefer the leftmost / topmost occurrence for each id (section header, not in-phone)
    idHits.push({ id: t, x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height });
  }

  // Keep best hit per id: smallest y, then smallest x (document order headers)
  const bestById = new Map();
  for (const hit of idHits.sort((a, b) => a.y - b.y || a.x - b.x)) {
    if (!bestById.has(hit.id)) bestById.set(hit.id, hit);
  }

  const phones = [];
  for (const el of document.querySelectorAll("div")) {
    const r = el.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    if (w >= 350 && w <= 430 && h >= 680 && h <= 920) {
      phones.push({ w, h, x: Math.round(r.x), y: Math.round(r.y + window.scrollY) });
    }
  }
  const seen = new Set();
  const uniq = [];
  for (const p of phones.sort((a, b) => a.y - b.y || a.x - b.x)) {
    const key = `${Math.round(p.x / 5)}:${Math.round(p.y / 5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(p);
  }

  const results = [];
  for (const id of ids) {
    const hit = bestById.get(id) || null;
    let phone = null;
    if (hit) {
      let best = Infinity;
      for (const p of uniq) {
        // Phone should be at or below the label, typically within ~500px vertically
        if (p.y + 40 < hit.y) continue;
        if (p.y - hit.y > 700) continue;
        const dx = Math.abs(p.x - hit.x);
        const dy = Math.max(0, p.y - hit.y);
        // Prefer same column (label often above-left of phone)
        const score = dy * 2 + dx;
        if (score < best) {
          best = score;
          phone = { ...p, score, dy, dx };
        }
      }
    }
    results.push({ id, hit, phone, hitCount: idHits.filter((h) => h.id === id).length });
  }
  return { results, phoneCount: uniq.length, totalIdHits: idHits.length };
}, IDS);

console.log("phones", located.phoneCount, "idHits", located.totalIdHits);
const ok = located.results.filter((r) => r.phone);
const miss = located.results.filter((r) => !r.phone).map((r) => r.id);
console.log("mapped", ok.length, "missing", miss.join(",") || "(none)");

await writeFile(path.join(OUT, "id-phone-map.json"), JSON.stringify(located, null, 2));

const log = [];
for (const item of located.results) {
  if (!item.phone) {
    log.push({ id: item.id, status: "missing", hit: item.hit });
    continue;
  }
  const f = item.phone;
  await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 40)), f.y);
  await page.waitForTimeout(120);
  const sy = await page.evaluate(() => window.scrollY);
  const clip = {
    x: Math.max(0, f.x),
    y: Math.max(0, f.y - sy),
    width: f.w,
    height: Math.min(f.h, 900),
  };
  try {
    const dest = path.join(OUT, `${item.id}.png`);
    await page.screenshot({ path: dest, clip });
    await copyFile(dest, path.join(MAPPED, `${item.id}-approved.png`));
    log.push({ id: item.id, status: "captured", hit: item.hit, frame: f });
    console.log("ok", item.id, `y=${f.y} score=${f.score.toFixed?.(1) || f.score}`);
  } catch (e) {
    log.push({ id: item.id, status: "error", error: e.message });
    console.log("fail", item.id, e.message);
  }
}

await writeFile(path.join(OUT, "id-capture-log.json"), JSON.stringify(log, null, 2));
await browser.close();
console.log("captured", log.filter((l) => l.status === "captured").length);
