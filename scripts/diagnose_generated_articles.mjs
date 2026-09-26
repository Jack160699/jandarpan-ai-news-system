import { execSync } from "node:child_process";

// 1. Fetch all generated_articles from Supabase via CLI
const sql = `
SELECT id, slug, headline, summary, hero_image_url, editorial_status, workflow_status, published_at, created_at, tags, editorial_metadata, geo_metadata
FROM generated_articles
ORDER BY published_at DESC NULLS LAST;
`;

const res = execSync(`npx supabase db query --linked "${sql.replace(/\n/g, " ")}"`, { encoding: "utf8" });

// Extract JSON rows
const boundaryMatch = res.match(/\{[\s\S]*"rows":\s*(\[[\s\S]*?\])[\s\S]*\}/);
if (!boundaryMatch) {
  console.error("Could not parse DB response:", res);
  process.exit(1);
}

const rows = JSON.parse(boundaryMatch[1]);
console.log(`Loaded ${rows.length} rows from generated_articles.`);

// Emulate filters from broadcast feed route
function isStockOrGenericMediaUrl(url) {
  if (!url) return true;
  const l = url.toLowerCase();
  return (
    l.includes("images.unsplash.com") ||
    l.includes("plus.unsplash.com") ||
    l.includes("source.unsplash.com") ||
    l.includes("pexels.com") ||
    l.includes("pixabay.com") ||
    l.includes("googleusercontent.com/j6_cofbogxh") ||
    l.includes("photo-1529107386315") ||
    l.includes("photo-1449824913935") ||
    l.includes("via.placeholder.com") ||
    l.includes("default.jpg") ||
    l.startsWith("data:")
  );
}

const CG_TEXT_SIGNALS = [
  "छत्तीसगढ़", "chhattisgarh", "chattisgarh",
  "रायपुर", "raipur", "दुर्ग", "durg", "भिलाई", "bhilai",
  "बिलासपुर", "bilaspur", "बस्तर", "bastar", "कोरबा", "korba",
  "राजनंदगांव", "rajnandgaon", "रायगढ़", "raigarh", "अंबिकापुर", "ambikapur",
  "जगदलपुर", "jagdalpur", "कांकेर", "kanker", "दंतेवाड़ा", "dantewada",
  "सुकमा", "sukma", "बीजापुर", "bijapur", "धमतरी", "dhamtari",
  "महासमुंद", "mahasamund", "कबीरधाम", "kabirdham", "कवर्धा", "kawardha",
  "बालोद", "balod", "बेमेतरा", "bemetara", "गरियाबंद", "gariaband",
  "बलौदाबाजार", "balodabazar", "जांजगीर", "janjgir", "चांपा", "champa",
  "सरगुजा", "surguja", "जशपुर", "jashpur", "कोरिया", "korea",
  "मनेंद्रगढ़", "manendragarh", "मोहला", "mohla", "सक्ती", "sakti",
  "सारंगढ़", "sarangarh", "खैरागढ़", "khairagarh", "पेंड्रा", "pendra",
  "गौरेला", "gaurela", "विष्णु देव साय", "विष्णुदेव साय", "साय कैबिनेट",
  "महानदी", "इंद्रावती", "हसदेव", "भिलाई स्टील", "bsp", "secl", "nmdc", "cspdcl"
];

function isCgStory(row) {
  const text = `${row.headline || ""} ${row.summary || ""}`.toLowerCase();
  const tags = row.tags || [];
  const isCgSection = tags.includes("chhattisgarh") || tags.includes("raipur");
  return CG_TEXT_SIGNALS.some(s => text.includes(s.toLowerCase())) || isCgSection;
}

const now = Date.now();
const thirtyDaysMs = 30 * 24 * 3600 * 1000;

const stats = {
  total: rows.length,
  published: 0,
  within30Days: 0,
  cgRelevant: 0,
  hasRealImage: 0,
  passedAll: 0,
  rejectedReasons: {
    not_published: 0,
    outside_30_days: 0,
    not_cg: 0,
    generic_image: 0,
    no_image: 0,
  }
};

const passedArticles = [];

for (const row of rows) {
  const isPub = ["approved", "published", "live"].includes(row.editorial_status) && !!row.published_at;
  if (!isPub) {
    stats.rejectedReasons.not_published++;
    continue;
  }
  stats.published++;

  const pubTime = new Date(row.published_at).getTime();
  const in30d = pubTime >= (now - thirtyDaysMs) && pubTime <= (now + 2 * 3600 * 1000);
  if (!in30d) {
    stats.rejectedReasons.outside_30_days++;
    continue;
  }
  stats.within30Days++;

  const cg = isCgStory(row);
  if (!cg) {
    stats.rejectedReasons.not_cg++;
    continue;
  }
  stats.cgRelevant++;

  const img = row.hero_image_url;
  if (!img) {
    stats.rejectedReasons.no_image++;
    continue;
  }
  if (isStockOrGenericMediaUrl(img)) {
    stats.rejectedReasons.generic_image++;
    continue;
  }
  stats.hasRealImage++;

  stats.passedAll++;
  passedArticles.push({
    id: row.id,
    headline: row.headline.slice(0, 50),
    published_at: row.published_at,
    hero_image_url: img.slice(0, 60),
  });
}

console.log("\n=== DIAGNOSTIC REPORT: generated_articles ===");
console.table(stats.rejectedReasons);
console.log(`Summary: total=${stats.total}, published=${stats.published}, passedAll=${stats.passedAll}`);
console.log("\nArticles that pass all filters:");
console.table(passedArticles);
