import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML = path.join(ROOT, "docs/jandarpan-reader-redesign/source-design/Jandarpan-Design-System.html.html");
const OUT = path.join(ROOT, "docs/jandarpan-reader-redesign/source-design/extracted/html");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } });
await page.goto("file:///" + HTML.replace(/\\/g, "/"), { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(5000);

const info = await page.evaluate(() => {
  const body = document.body.innerText || "";
  const samples = [];
  for (const needle of ["A1", "HOMEPAGE", "SIGN IN", "DISTRICT SELECTOR", "जनदर्पण", "भाग", "SCREEN", "D28"]) {
    const idx = body.indexOf(needle);
    samples.push({
      needle,
      idx,
      around: idx >= 0 ? body.slice(Math.max(0, idx - 40), idx + 80).replace(/\n/g, " | ") : null,
    });
  }
  // SVG text content
  const svgTexts = [...document.querySelectorAll("svg text, text")].map((el) => (el.textContent || "").trim()).filter(Boolean).slice(0, 40);
  // aria / titles
  const titles = [...document.querySelectorAll("[aria-label],[title]")].slice(0, 20).map((el) => ({
    tag: el.tagName,
    aria: el.getAttribute("aria-label"),
    title: el.getAttribute("title"),
  }));
  return {
    bodyLen: body.length,
    samples,
    svgTexts,
    titles,
    hasHomepage: /HOMEPAGE/i.test(body),
    screenMentions: [...body.matchAll(/\b([A-F]\d{1,2})\b/g)].slice(0, 30).map((m) => m[1]),
  };
});

await writeFile(path.join(OUT, "dom-text-probe.json"), JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
await browser.close();
