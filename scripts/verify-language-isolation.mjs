/**
 * Phase 3A language isolation verification — run against local or preview URL.
 * Usage: node scripts/verify-language-isolation.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? "http://localhost:3456";

const DEVANAGARI = /[\u0900-\u097F]/;
const ENGLISH_HEADLINE =
  /\b(the|and|with|from|said|will|have|been|news|politics|government|minister|cricket|india|state|district|report|update|latest)\b/i;

function extractHeadlines(html) {
  const headlines = [];
  for (const m of html.matchAll(/"headline":"((?:\\.|[^"\\])*)"/g)) {
    try {
      headlines.push(JSON.parse(`"${m[1]}"`));
    } catch {
      headlines.push(m[1]);
    }
  }
  for (const m of html.matchAll(
    /class="[^"]*(?:story-card|immersive-story__headline|search-hit__title|reels-slide__headline)[^"]*"[^>]*>([^<]{8,})</gi
  )) {
    headlines.push(m[1].trim());
  }
  return [...new Set(headlines.filter(Boolean))];
}

function extractTrending(html) {
  const trends = [];
  for (const m of html.matchAll(/search-trending__link[^>]*>([^<]+)</g)) {
    trends.push(m[1].trim());
  }
  return trends;
}

function countHindi(items) {
  return items.filter((t) => DEVANAGARI.test(t)).length;
}

function countEnglish(items) {
  return items.filter((t) => !DEVANAGARI.test(t) && ENGLISH_HEADLINE.test(t)).length;
}

async function fetchText(url, cookie) {
  const res = await fetch(url, {
    headers: { Cookie: `cgb-language=${cookie}; cgb-language-chosen=1` },
  });
  return { status: res.status, text: await res.text() };
}

async function fetchJson(url, cookie) {
  const res = await fetch(url, {
    headers: { Cookie: `cgb-language=${cookie}; cgb-language-chosen=1` },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, text, json };
}

const pages = [
  { name: "Homepage", path: "/" },
  { name: "Category", path: "/category/politics" },
  { name: "District", path: "/district/raipur" },
  { name: "Search", path: "/search?q=news" },
  { name: "Shorts", path: "/shorts" },
  { name: "Listen", path: "/listen" },
];

const apis = [
  { name: "Homepage Live", path: "/api/homepage/live" },
  { name: "Search API", path: "/api/search?q=cricket&limit=10" },
  { name: "Regional Feed", path: "/api/regional/feed" },
  { name: "Shorts Feed", path: "/api/shorts/feed" },
];

console.log(`\n=== Language isolation verification @ ${BASE} ===\n`);

const results = [];

for (const cookie of ["en", "hi"]) {
  const expect = cookie === "en" ? "hindiHeadlines" : "englishHeadlines";
  console.log(`--- Cookie: ${cookie} (expect 0 ${expect === "hindiHeadlines" ? "Hindi" : "English"} headline leakage) ---`);

  for (const page of pages) {
    const { status, text } = await fetchText(`${BASE}${page.path}`, cookie);
    const headlines = extractHeadlines(text);
    const trending = page.name === "Search" ? extractTrending(text) : [];
    const hi = countHindi(headlines);
    const en = countEnglish(headlines);
    const trendHi = countHindi(trending);
    const trendEn = countEnglish(trending);
    const leak =
      cookie === "en" ? hi + trendHi : en + trendEn;
    results.push({
      surface: page.name,
      cookie,
      status,
      headlineCount: headlines.length,
      hindiHeadlines: hi,
      englishHeadlines: en,
      trendingHindi: trendHi,
      trendingEnglish: trendEn,
      leakage: leak,
    });
    console.log(
      `  ${page.name.padEnd(12)} HTTP ${status} | headlines ${headlines.length} | hi ${hi} en ${en} | trending hi ${trendHi} en ${trendEn} | LEAK ${leak}`
    );
  }

  for (const api of apis) {
    const { status, json, text } = await fetchJson(`${BASE}${api.path}`, cookie);
    const headlines = [];
    if (json?.hits) headlines.push(...json.hits.map((h) => h.headline));
    if (json?.shorts) headlines.push(...json.shorts.map((s) => s.headline));
    if (json?.snapshot?.sections) {
      for (const section of json.snapshot.sections) {
        for (const a of section.articles ?? []) headlines.push(a.headline);
      }
    }
    if (json?.snapshot?.lead?.headline) headlines.push(json.snapshot.lead.headline);
    if (json?.snapshot?.breakingTicker) {
      for (const a of json.snapshot.breakingTicker) headlines.push(a.headline);
    }
    if (json?.feeds) {
      for (const f of json.feeds) {
        for (const a of f.articles ?? []) headlines.push(a.headline);
      }
    }
    if (json?.breakingAlerts) {
      for (const a of json.breakingAlerts) headlines.push(a.headline);
    }
    const trending = json?.trending ?? [];
    const hi = countHindi(headlines);
    const en = countEnglish(headlines);
    const trendHi = countHindi(trending);
    const trendEn = countEnglish(trending);
    const leak = cookie === "en" ? hi + trendHi : en + trendEn;
    results.push({
      surface: api.name,
      cookie,
      status,
      headlineCount: headlines.length,
      hindiHeadlines: hi,
      englishHeadlines: en,
      trendingHindi: trendHi,
      trendingEnglish: trendEn,
      leakage: leak,
      error: json?.error,
    });
    console.log(
      `  ${api.name.padEnd(12)} HTTP ${status} | headlines ${headlines.length} | hi ${hi} en ${en} | trending hi ${trendHi} en ${trendEn} | LEAK ${leak}${json?.error ? ` | err: ${json.error}` : ""}`
    );
    if (status !== 200 && !json?.ok) {
      console.log(`    body: ${text.slice(0, 200)}`);
    }
  }
  console.log("");
}

const totalLeakage = results.reduce((s, r) => s + r.leakage, 0);
const failedApi = results.filter((r) => r.status >= 500 || (r.surface.includes("API") && r.status !== 200));
console.log(`TOTAL LEAKAGE: ${totalLeakage}`);
console.log(`API FAILURES: ${failedApi.length}`);
console.log(`READY FOR MERGE: ${totalLeakage === 0 && failedApi.length === 0 ? "YES" : "NO"}`);
process.exit(totalLeakage === 0 && failedApi.length === 0 ? 0 : 1);
