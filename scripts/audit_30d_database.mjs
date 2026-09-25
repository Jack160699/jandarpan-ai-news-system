import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Load .env.production.local or .env.production
let envContent = "";
if (fs.existsSync(".env.production.local")) {
  envContent = fs.readFileSync(".env.production.local", "utf8");
} else if (fs.existsSync(".env.production")) {
  envContent = fs.readFileSync(".env.production", "utf8");
}

const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1].trim()] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  console.log("=================================================");
  console.log("JAN DARPAN — 30-DAY DATABASE FORENSIC AUDIT");
  console.log("=================================================");

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  console.log(`Auditing from ${thirtyDaysAgo} to ${now.toISOString()}`);

  // Fetch all articles from the last 30 days
  const { data: articles, error } = await supabase
    .from("generated_articles")
    .select("*")
    .gte("published_at", thirtyDaysAgo)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Error querying generated_articles:", error);
    return;
  }

  console.log(`\nTotal articles returned from DB (published_at >= 30d): ${articles.length}`);

  // Also check all articles regardless of date to see total DB size
  const { count: totalDbCount, error: countErr } = await supabase
    .from("generated_articles")
    .select("*", { count: "exact", head: true });

  console.log(`Total articles in entire DB: ${totalDbCount}`);

  // Check publication status distribution
  const statusCounts = {};
  articles.forEach((a) => {
    const st = a.workflow_status || a.status || "unknown";
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });
  console.log("\nWorkflow status distribution (30d):", statusCounts);

  // Date distribution breakdown
  const dateBuckets = {
    today: 0,
    "1-3 days ago": 0,
    "4-7 days ago": 0,
    "8-15 days ago": 0,
    "16-21 days ago": 0,
    "22-30 days ago": 0,
    "older than 30 days": 0,
  };

  const dayNow = now.getTime();
  articles.forEach((a) => {
    const pub = new Date(a.published_at || a.created_at).getTime();
    const diffDays = (dayNow - pub) / (24 * 3600 * 1000);
    if (diffDays <= 1) dateBuckets["today"]++;
    else if (diffDays <= 3) dateBuckets["1-3 days ago"]++;
    else if (diffDays <= 7) dateBuckets["4-7 days ago"]++;
    else if (diffDays <= 15) dateBuckets["8-15 days ago"]++;
    else if (diffDays <= 21) dateBuckets["16-21 days ago"]++;
    else if (diffDays <= 30) dateBuckets["22-30 days ago"]++;
    else dateBuckets["older than 30 days"]++;
  });

  console.log("\nDate distribution breakdown:", dateBuckets);

  // District distribution
  const districtCounts = {};
  articles.forEach((a) => {
    const d = a.district || a.district_slug || "None";
    districtCounts[d] = (districtCounts[d] || 0) + 1;
  });
  console.log("\nDistrict distribution (DB):", districtCounts);

  // Language representation audit
  let hasHindi = 0;
  let hasEnglish = 0;
  let missingHindi = 0;
  let missingEnglish = 0;

  articles.forEach((a) => {
    const isDevanagari = /[\u0900-\u097F]/.test(a.headline || "");
    const trans = a.translations || a.editorial_metadata?.translations;
    const hasEnTrans = !!trans?.en?.headline;
    const hasHiTrans = !!trans?.hi?.headline;

    if (isDevanagari || hasHiTrans) hasHindi++;
    else missingHindi++;

    if (!isDevanagari || hasEnTrans) hasEnglish++;
    else missingEnglish++;
  });

  console.log("\nLanguage representation:");
  console.log(`- Articles with Hindi representation: ${hasHindi}/${articles.length}`);
  console.log(`- Articles with English representation: ${hasEnglish}/${articles.length}`);
  console.log(`- Articles missing English translation bundle: ${missingEnglish}`);
  console.log(`- Articles missing Hindi text: ${missingHindi}`);

  // Image & Real Media Audit
  let withImage = 0;
  let withoutImage = 0;
  let verifiedMedia = 0;
  articles.forEach((a) => {
    const img = a.image_url || a.og_image_url || a.editorial_metadata?.image_url;
    if (img && img.trim().length > 0) {
      withImage++;
      if (!img.includes("placeholder") && !img.includes("avatar") && !img.includes("default")) {
        verifiedMedia++;
      }
    } else {
      withoutImage++;
    }
  });

  console.log("\nMedia Audit:");
  console.log(`- Articles with image_url: ${withImage}`);
  console.log(`- Articles without image_url: ${withoutImage}`);
  console.log(`- Articles with verified real media: ${verifiedMedia}`);

  // Why are articles excluded from the broadcast feed?
  // Let's inspect the feed query from /api/broadcast/feed/route.ts
  console.log("\nAuditing Feed Exclusion Criteria against DB:");
  const publishedArticles = articles.filter(
    (a) => (a.workflow_status === "published" || a.status === "published")
  );
  console.log(`- Published status count: ${publishedArticles.length}`);

  const withMediaAndPublished = publishedArticles.filter((a) => {
    const img = a.image_url || a.og_image_url || a.editorial_metadata?.image_url;
    return img && !img.includes("placeholder");
  });
  console.log(`- Published + Valid Media count: ${withMediaAndPublished.length}`);

  // Print sample of 5 oldest and 5 newest articles with IDs and published_at
  console.log("\nSample 5 Newest Articles:");
  articles.slice(0, 5).forEach((a, i) => {
    console.log(`  [${i+1}] ID: ${a.id} | Date: ${a.published_at} | Status: ${a.workflow_status} | District: ${a.district} | Headline: "${(a.headline || '').slice(0, 40)}..."`);
  });

  console.log("\nSample 5 Oldest Articles in 30d window:");
  articles.slice(-5).forEach((a, i) => {
    console.log(`  [${i+1}] ID: ${a.id} | Date: ${a.published_at} | Status: ${a.workflow_status} | District: ${a.district} | Headline: "${(a.headline || '').slice(0, 40)}..."`);
  });

  // Check internal provenance (source fields) in DB
  const sampleSources = articles.slice(0, 10).map((a) => ({
    id: a.id,
    source_name: a.source_name || a.source || a.source_url || a.editorial_metadata?.source_name,
    has_provenance: !!(a.source_name || a.source || a.source_url || a.editorial_metadata?.source_name),
  }));
  console.log("\nSample Source Provenance in DB (first 10):", sampleSources);
}

runAudit();
