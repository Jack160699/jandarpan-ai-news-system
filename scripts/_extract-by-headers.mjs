/**
 * Remap phone frames by section header positions (A1 HOMEPAGE, D28 SIGN IN, …).
 */
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML = path.join(ROOT, "docs/jandarpan-reader-redesign/source-design/Jandarpan-Design-System.html.html");
const OUT = path.join(ROOT, "docs/jandarpan-reader-redesign/source-design/extracted/html");
const MAPPED = path.join(ROOT, "docs/jandarpan-reader-redesign/source-design/extracted/mapped");

const HEADERS = [
  ["A1", "A1 HOMEPAGE"],
  ["A2", "A2 DISTRICT HOMEPAGE"],
  ["A3", "A3 CATEGORY PAGE"],
  ["A4", "A4 LATEST NEWS"],
  ["A5", "A5 TRENDING"],
  ["A6", "A6 SEARCH OVERLAY"],
  ["A7", "A7 SEARCH RESULTS"],
  ["A8", "A8 TOPIC PAGE"],
  ["A9", "A9 LIVE NEWS"],
  ["A10", "A10 DISTRICT SELECTOR"],
  ["B11", "B11 STANDARD ARTICLE"],
  ["B12", "B12 BREAKING ARTICLE"],
  ["B13", "B13 LIVE BLOG"],
  ["B14", "B14 PHOTO STORY"],
  ["B15", "B15 VIDEO STORY"],
  ["B16", "B16 EXPLAINER"],
  ["B17", "B17 OPINION / EDITORIAL"],
  ["B18", "B18 SPONSORED ARTICLE"],
  ["B19", "B19 PREMIUM ARTICLE"],
  ["B20", "B20 ARTICLE WITH UNAVAILABLE IMAGE"],
  ["C21", "C21 TOP-10 AUDIO BRIEFING"],
  ["C22", "C22 MINI PLAYER"],
  ["C23", "C23 FULL AUDIO PLAYER"],
  ["C24", "C24 QUEUE & PLAYBACK SETTINGS"],
  ["C25", "C25 OFFLINE / DOWNLOADED AUDIO"],
  ["D26", "D26 LANGUAGE SELECTION"],
  ["D27", "D27 ONBOARDING"],
  ["D28", "D28 SIGN IN / SIGN UP"],
  ["D29", "D29 READER PROFILE"],
  ["D30", "D30 SAVED STORIES"],
  ["D31", "D31 READING HISTORY"],
  ["D32", "D32 FOLLOWED TOPICS"],
  ["D33", "D33 NOTIFICATION PREFERENCES"],
  ["D34", "D34 DISTRICT PREFERENCES"],
  ["D35", "D35 ACCESSIBILITY & DATA-SAVING"],
  ["E36", "E36 MEMBERSHIP LANDING"],
  ["E37", "E37 PLAN COMPARISON"],
  ["E38", "E38 PREMIUM CONTENT GATE"],
  ["E39", "E39 CHECKOUT"],
  ["E40", "E40 PAYMENT SUCCESS"],
  ["E41", "E41 PAYMENT FAILURE"],
  ["E42", "E42 MANAGE SUBSCRIPTION"],
  ["E43", "E43 AD-FREE MEMBER STATE"],
  ["E44", "E44 NATIVE SPONSORED PLACEMENT"],
  ["E45", "E45 DISPLAY ADS WITH CLOSE"],
  ["F46", "F46 LOADING"],
  ["F47", "F47 EMPTY STATE"],
  ["F48", "F48 GENERAL ERROR"],
  ["F49", "F49 OFFLINE"],
  ["F50", "F50 SLOW CONNECTION"],
  ["F51", "F51 NOTIFICATION PERMISSION"],
  ["F52", "F52 LOCATION PERMISSION"],
  ["F53", "F53 MAINTENANCE"],
  ["F54", "F54 404"],
];

await mkdir(OUT, { recursive: true });
await mkdir(MAPPED, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 }, deviceScaleFactor: 1 });
await page.goto("file:///" + HTML.replace(/\\/g, "/"), { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(6000);

const located = await page.evaluate((headers) => {
  // Build a flat list of text runs with geometry via TreeWalker on text nodes
  const runs = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const raw = node.nodeValue || "";
    const t = raw.replace(/\s+/g, " ").trim();
    if (!t || t.length < 2) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    runs.push({
      t,
      x: r.x,
      y: r.y + window.scrollY,
      w: r.width,
      h: r.height,
    });
  }

  // Also collect phone-ish boxes with wider tolerance
  const phones = [];
  for (const el of document.querySelectorAll("div")) {
    const r = el.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    if (w >= 350 && w <= 430 && h >= 680 && h <= 920) {
      phones.push({
        w,
        h,
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
      });
    }
  }
  // dedupe
  const seen = new Set();
  const uniqPhones = [];
  for (const p of phones.sort((a, b) => a.y - b.y || a.x - b.x)) {
    const key = `${Math.round(p.x / 4)}:${Math.round(p.y / 4)}:${p.w}:${p.h}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqPhones.push(p);
  }

  const results = [];
  for (const [id, header] of headers) {
    // Find text run that best matches header (exact or startsWith)
    let hit = null;
    const want = header.toUpperCase();
    const shortWant = want.slice(0, Math.min(want.length, 22));
    for (const run of runs) {
      const u = run.t.toUpperCase();
      if (u === want || u.startsWith(shortWant) || want.startsWith(u) && u.length >= 10) {
        hit = run;
        break;
      }
    }
    // Partial: id + first distinctive word
    if (!hit) {
      const word = want.split(/\s+/)[1] || "";
      for (const run of runs) {
        const u = run.t.toUpperCase();
        if (u.includes(id) && word && u.includes(word) && run.t.length < 80) {
          hit = run;
          break;
        }
      }
    }

    let phone = null;
    if (hit) {
      // Prefer phone below header, same column-ish, within 700px
      let best = Infinity;
      for (const p of uniqPhones) {
        if (p.y < hit.y - 10) continue;
        if (p.y - hit.y > 900) continue;
        const dx = Math.abs(p.x - hit.x);
        const dy = p.y - hit.y;
        const score = dy + dx * 0.5;
        if (score < best) {
          best = score;
          phone = { ...p, score };
        }
      }
    }
    results.push({
      id,
      header,
      hit: hit ? { t: hit.t, x: hit.x, y: hit.y } : null,
      phone,
    });
  }
  return { results, phoneCount: uniqPhones.length, runCount: runs.length };
}, HEADERS);

console.log("phones", located.phoneCount, "runs", located.runCount);
const found = located.results.filter((r) => r.phone);
const missing = located.results.filter((r) => !r.phone);
console.log("mapped", found.length, "missing", missing.map((m) => m.id).join(","));

await writeFile(path.join(OUT, "header-phone-map.json"), JSON.stringify(located, null, 2));

const captureLog = [];
for (const item of located.results) {
  if (!item.phone) {
    captureLog.push({ id: item.id, status: "missing" });
    continue;
  }
  const f = item.phone;
  await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 40)), f.y);
  await page.waitForTimeout(140);
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
    captureLog.push({
      id: item.id,
      status: "captured",
      headerHit: item.hit?.t || null,
      frame: f,
    });
    console.log("ok", item.id, item.hit?.t?.slice(0, 40));
  } catch (e) {
    captureLog.push({ id: item.id, status: "error", error: e.message });
    console.log("fail", item.id, e.message);
  }
}

await writeFile(path.join(OUT, "header-capture-log.json"), JSON.stringify(captureLog, null, 2));
await browser.close();
console.log("done", captureLog.filter((c) => c.status === "captured").length);
