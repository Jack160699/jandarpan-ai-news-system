import fs from "node:fs";

const TARGET_URL = "https://www.jandarpan.news";

async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) return { error: `HTTP ${res.status}`, status: res.status };
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

async function runAudit() {
  console.log("=================================================================");
  console.log("JAN DARPAN — LIVE PRODUCTION DATA & UNIVERSE FORENSIC AUDIT");
  console.log("Target:", TARGET_URL);
  console.log("Timestamp:", new Date().toISOString());
  console.log("=================================================================\n");

  // 1. Fetch live broadcast feeds in both languages
  console.log("[1] Fetching Live Broadcast Feeds (Hindi & English)...");
  const feedHi = await fetchJson(`${TARGET_URL}/api/broadcast/feed?lang=hi`);
  const feedEn = await fetchJson(`${TARGET_URL}/api/broadcast/feed?lang=en`);

  console.log("Feed HI Meta:", feedHi.meta);
  console.log("Feed EN Meta:", feedEn.meta);

  const queueHi = feedHi.queue || [];
  const queueEn = feedEn.queue || [];
  const breakingHi = feedHi.breaking || [];
  const breakingEn = feedEn.breaking || [];

  console.log(`Queue HI count: ${queueHi.length}, Queue EN count: ${queueEn.length}`);
  console.log(`Breaking HI count: ${breakingHi.length}, Breaking EN count: ${breakingEn.length}`);

  // 2. Fetch Regional Feed (Districts)
  console.log("\n[2] Fetching Regional Feed (Districts)...");
  const regFeed = await fetchJson(`${TARGET_URL}/api/regional/feed`);
  const regionalDistricts = regFeed.feeds || [];
  console.log(`Total Regional District Feeds: ${regionalDistricts.length}`);
  const allRegionalStories = [];
  const seenRegIds = new Set();

  for (const d of regionalDistricts) {
    const arts = d.articles || [];
    console.log(`  - District: ${d.districtSlug.padEnd(14)} (${d.districtNameHi.padEnd(10)}) -> ${arts.length} stories`);
    for (const a of arts) {
      if (!seenRegIds.has(a.id || a.slug)) {
        seenRegIds.add(a.id || a.slug);
        allRegionalStories.push({ ...a, districtFoundIn: d.districtSlug });
      }
    }
  }
  console.log(`Unique stories in Regional Feeds: ${allRegionalStories.length}`);

  // 3. Fetch Homepage Live snapshot
  console.log("\n[3] Fetching Homepage Live Snapshot...");
  const homeLive = await fetchJson(`${TARGET_URL}/api/homepage/live`);
  console.log("Homepage Live Meta:", homeLive.meta);
  const homeLiveWire = homeLive.snapshot?.liveWire || [];
  const homeTrending = homeLive.snapshot?.trending || [];
  console.log(`LiveWire: ${homeLiveWire.length}, Trending: ${homeTrending.length}`);

  // 4. Inspect Local Wire/Fallback Pool File
  console.log("\n[4] Inspecting Wire/Fallback Articles File...");
  let wireFileContent = "";
  try {
    wireFileContent = fs.readFileSync("src/lib/news/fallback/wire-articles.ts", "utf8");
  } catch {}

  const wireIdMatches = [...wireFileContent.matchAll(/id:\s*["']([^"']+)["']/g)].map((m) => m[1]);
  console.log(`Static fallback articles count in codebase: ${wireIdMatches.length}`);

  // 5. Build Unified Universe of All Discoverable Articles
  const unifiedArticlesMap = new Map();

  function addArticle(art, sourceOrigin) {
    const id = art.id || art.articleId || art.slug;
    if (!id) return;
    if (!unifiedArticlesMap.has(id)) {
      unifiedArticlesMap.set(id, {
        id,
        slug: art.slug,
        headlineHi: art.headlineHi || art.headline,
        headlineEn: art.headlineEn,
        summaryHi: art.summaryHi || art.summary,
        summaryEn: art.summaryEn,
        district: art.district || art.districtSlug,
        districtHi: art.districtHi,
        districtEn: art.districtEn,
        section: art.section,
        categoryLabel: art.categoryLabel,
        categoryLabelHi: art.categoryLabelHi,
        categoryLabelEn: art.categoryLabelEn,
        canonicalCategories: art.canonicalCategories || [],
        primaryCategory: art.primaryCategory,
        imageUrl: art.imageUrl || art.hero_image_url,
        publishedAt: art.publishedAt || art.published_at,
        isBreaking: art.isBreaking,
        sources: [sourceOrigin],
        inLiveQueue: false,
        inBreaking: false,
        inRegional: false,
      });
    } else {
      const existing = unifiedArticlesMap.get(id);
      if (!existing.sources.includes(sourceOrigin)) existing.sources.push(sourceOrigin);
      if (!existing.imageUrl && (art.imageUrl || art.hero_image_url)) existing.imageUrl = art.imageUrl || art.hero_image_url;
      if (!existing.canonicalCategories.length && art.canonicalCategories?.length) existing.canonicalCategories = art.canonicalCategories;
      if (!existing.headlineEn && art.headlineEn) existing.headlineEn = art.headlineEn;
      if (!existing.summaryEn && art.summaryEn) existing.summaryEn = art.summaryEn;
    }
  }

  queueHi.forEach((a) => {
    addArticle(a, "live_queue_hi");
    const item = unifiedArticlesMap.get(a.id || a.articleId || a.slug);
    if (item) item.inLiveQueue = true;
  });

  queueEn.forEach((a) => {
    addArticle(a, "live_queue_en");
    const item = unifiedArticlesMap.get(a.id || a.articleId || a.slug);
    if (item) {
      item.inLiveQueue = true;
      if (a.headlineEn) item.headlineEn = a.headlineEn;
    }
  });

  breakingHi.forEach((a) => {
    addArticle(a, "breaking_hi");
    const item = unifiedArticlesMap.get(a.id || a.articleId || a.slug);
    if (item) item.inBreaking = true;
  });

  allRegionalStories.forEach((a) => {
    addArticle(a, `regional_${a.districtFoundIn}`);
    const item = unifiedArticlesMap.get(a.id || a.slug);
    if (item) item.inRegional = true;
  });

  homeLiveWire.forEach((a) => addArticle(a, "home_liveWire"));
  homeTrending.forEach((a) => addArticle(a, "home_trending"));

  console.log(`\n=================================================================`);
  console.log(`TOTAL CANONICAL ARTICLES IN DISCOVERABLE PRODUCTION UNIVERSE: ${unifiedArticlesMap.size}`);
  console.log(`=================================================================\n`);

  const allArticlesList = Array.from(unifiedArticlesMap.values());

  // ─── AUDIT SECTION 1: 30-DAY NEWS UNIVERSE BREAKDOWN ──────────────────────
  console.log("--- 1. DATE DISTRIBUTION OF AUDITED POOL ---");
  const nowMs = Date.now();
  const dateBuckets = {
    "Today (0 - 24 hrs)": 0,
    "3 days ago (24 - 72 hrs)": 0,
    "7 days ago (3 - 7 days)": 0,
    "15 days ago (7 - 15 days)": 0,
    "21 days ago (15 - 21 days)": 0,
    "30 days ago (21 - 30 days)": 0,
    "Older than 30 days (> 30 days)": 0,
    "Invalid/No Date": 0,
  };

  const datesWithArticles = [];

  for (const art of allArticlesList) {
    if (!art.publishedAt) {
      dateBuckets["Invalid/No Date"]++;
      continue;
    }
    const pubMs = new Date(art.publishedAt).getTime();
    if (isNaN(pubMs)) {
      dateBuckets["Invalid/No Date"]++;
      continue;
    }
    const ageDays = (nowMs - pubMs) / (24 * 3600 * 1000);
    datesWithArticles.push({ id: art.id, date: art.publishedAt, ageDays: ageDays.toFixed(2), headline: art.headlineHi });

    if (ageDays <= 1) dateBuckets["Today (0 - 24 hrs)"]++;
    else if (ageDays <= 3) dateBuckets["3 days ago (24 - 72 hrs)"]++;
    else if (ageDays <= 7) dateBuckets["7 days ago (3 - 7 days)"]++;
    else if (ageDays <= 15) dateBuckets["15 days ago (7 - 15 days)"]++;
    else if (ageDays <= 21) dateBuckets["21 days ago (15 - 21 days)"]++;
    else if (ageDays <= 30) dateBuckets["30 days ago (21 - 30 days)"]++;
    else dateBuckets["Older than 30 days (> 30 days)"]++;
  }

  console.table(dateBuckets);

  // Sort by age
  datesWithArticles.sort((a, b) => parseFloat(a.ageDays) - parseFloat(b.ageDays));
  console.log(`Newest Story: [${datesWithArticles[0]?.date}] (${datesWithArticles[0]?.ageDays} days ago) - ${datesWithArticles[0]?.headline?.slice(0, 40)}`);
  console.log(`Oldest Story: [${datesWithArticles[datesWithArticles.length - 1]?.date}] (${datesWithArticles[datesWithArticles.length - 1]?.ageDays} days ago) - ${datesWithArticles[datesWithArticles.length - 1]?.headline?.slice(0, 40)}`);

  // District Breakdown
  console.log("\n--- ARTICLES BY DISTRICT ---");
  const districtCounts = {};
  for (const art of allArticlesList) {
    const d = art.district || "Unknown/Statewide";
    districtCounts[d] = (districtCounts[d] || 0) + 1;
  }
  console.table(districtCounts);

  // Category Breakdown
  console.log("\n--- ARTICLES BY CANONICAL CATEGORY ---");
  const categoryCounts = {};
  for (const art of allArticlesList) {
    const cats = art.canonicalCategories?.length ? art.canonicalCategories : [art.primaryCategory || "Uncategorized"];
    for (const c of cats) {
      categoryCounts[c] = (categoryCounts[c] || 0) + 1;
    }
  }
  console.table(categoryCounts);

  // Language Breakdown
  console.log("\n--- LANGUAGE REPRESENTATION AUDIT ---");
  let hasHiCount = 0;
  let hasEnCount = 0;
  let missingHiCount = 0;
  let missingEnCount = 0;
  const missingEnList = [];

  for (const art of allArticlesList) {
    const hasHi = /[\u0900-\u097F]/.test(art.headlineHi || "") || art.headlineHi;
    const hasEn = art.headlineEn || !/[\u0900-\u097F]/.test(art.headlineHi || "");

    if (hasHi) hasHiCount++;
    else missingHiCount++;

    if (hasEn) hasEnCount++;
    else {
      missingEnCount++;
      missingEnList.push({ id: art.id, headline: art.headlineHi?.slice(0, 50) });
    }
  }
  console.log(`Articles with Hindi representation: ${hasHiCount}/${allArticlesList.length}`);
  console.log(`Articles with English representation: ${hasEnCount}/${allArticlesList.length}`);
  console.log(`Articles missing English representation: ${missingEnCount}`);
  if (missingEnList.length > 0) {
    console.log("Sample missing English:", missingEnList.slice(0, 5));
  }

  // ─── AUDIT SECTION 2: HINDI ↔ ENGLISH PARITY AUDIT ────────────────────────
  console.log("\n--- 2. HINDI ↔ ENGLISH QUEUE PARITY AUDIT ---");
  const hiIds = new Set(queueHi.map((s) => s.id));
  const enIds = new Set(queueEn.map((s) => s.id));

  const missingInEn = queueHi.filter((s) => !enIds.has(s.id));
  const missingInHi = queueEn.filter((s) => !hiIds.has(s.id));

  console.log(`Total Hindi Queue Stories: ${queueHi.length}`);
  console.log(`Total English Queue Stories: ${queueEn.length}`);
  console.log(`Stories in HI but missing in EN: ${missingInEn.length}`);
  console.log(`Stories in EN but missing in HI: ${missingInHi.length}`);

  // Detailed Parity Mismatch Table
  const parityTable = queueHi.map((s, idx) => {
    const enStory = queueEn.find((e) => e.id === s.id);
    return {
      index: idx + 1,
      id: s.id,
      headlineHi: (s.headlineHi || s.headline || "").slice(0, 30) + "...",
      headlineEn: (enStory?.headlineEn || enStory?.headline || "").slice(0, 30) + "...",
      districtHi: s.districtHi || s.district,
      districtEn: enStory?.districtEn || enStory?.district,
      categoryHi: (s.canonicalCategories || []).join(", "),
      categoryEn: (enStory?.canonicalCategories || []).join(", "),
      imageMatched: s.imageUrl === enStory?.imageUrl,
      parityPass: !!enStory,
    };
  });
  console.log("\nSample First 10 Stories Parity Check:");
  console.table(parityTable.slice(0, 10));

  // ─── AUDIT SECTION 8: TV QUEUE VS READER QUEUE AUDIT ───────────────────────
  console.log("\n--- 8. TV QUEUE VS READER QUEUE AUDIT ---");
  const liveQueueIds = new Set(queueHi.map((s) => s.id));
  const regionalOnlyIds = allRegionalStories.filter((s) => !liveQueueIds.has(s.id));
  console.log(`Stories in Live TV queue: ${liveQueueIds.size}`);
  console.log(`Stories in Regional feeds: ${allRegionalStories.length}`);
  console.log(`Stories in Regional feeds that are NOT in Live TV queue: ${regionalOnlyIds.length}`);

  if (regionalOnlyIds.length > 0) {
    console.log("Sample stories in Regional but excluded from Live TV queue:");
    regionalOnlyIds.slice(0, 8).forEach((r, i) => {
      console.log(`  ${i+1}. [${r.districtFoundIn}] ID: ${r.id} | Pub: ${r.publishedAt || r.published_at} | Headline: "${(r.headline || '').slice(0, 45)}..."`);
    });
  }

  // ─── AUDIT SECTION 10: SPOKEN ANCHOR SCRIPT AUDIT ──────────────────────────
  console.log("\n--- 10. REAL SPOKEN ANCHOR SCRIPT PAYLOAD AUDIT ---");
  const scriptAudit = queueHi.slice(0, 6).map((s, idx) => {
    const script = s.script || "";
    const hl = s.headlineHi || s.headline || "";
    // Check if headline appears more than once in the script
    const hlTrim = hl.trim();
    const countHl = hlTrim ? (script.split(hlTrim).length - 1) : 0;
    const hasDuplicateHl = countHl > 1;
    const hasOverview = script.length > hl.length + 10;
    const isAbrupt = script.endsWith("...") || script.length < 20;

    return {
      index: idx + 1,
      id: s.id,
      headlineChars: hl.length,
      scriptChars: script.length,
      headlineCountInScript: countHl,
      hasDuplicateHeadline: hasDuplicateHl,
      hasConciseOverview: hasOverview,
      isAbruptEnding: isAbrupt,
      scriptPreview: script.slice(0, 80) + "...",
    };
  });
  console.table(scriptAudit);

  // ─── AUDIT SECTION 16: IMAGES & BRANDING AUDIT ─────────────────────────────
  console.log("\n--- 16. IMAGE RENDERING & DUPLICATION AUDIT ---");
  const imageUsage = {};
  for (const art of allArticlesList) {
    if (art.imageUrl) {
      imageUsage[art.imageUrl] = (imageUsage[art.imageUrl] || 0) + 1;
    }
  }

  const duplicates = Object.entries(imageUsage).filter(([url, count]) => count > 1);
  console.log(`Total unique image URLs: ${Object.keys(imageUsage).length}`);
  console.log(`Images used across multiple stories: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log("Duplicate image details:", duplicates);
  }

  // Check sample image URLs
  console.log("\nSample Image URLs from queue:");
  queueHi.slice(0, 5).forEach((s, i) => {
    console.log(`  [${i+1}] ${s.imageUrl}`);
  });

  return {
    totalArticles: allArticlesList.length,
    queueHiCount: queueHi.length,
    queueEnCount: queueEn.length,
    regionalStoriesCount: allRegionalStories.length,
    dateBuckets,
    districtCounts,
    categoryCounts,
  };
}

runAudit();
