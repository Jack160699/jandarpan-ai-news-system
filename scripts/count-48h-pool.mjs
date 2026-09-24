import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read env file
const envContent = fs.readFileSync(".env.production.local", "utf8");
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx > 0) {
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl ? "Found (starts with " + supabaseUrl.slice(0, 15) + "...)" : "Not found");

const supabase = createClient(supabaseUrl, supabaseKey);

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

const EXCLUDE_SIGNALS = [
  "मध्य प्रदेश", "madhya pradesh",
  "पश्चिम बंगाल", "west bengal", "बंगाल में",
  "जम्मू-कश्मीर", "jammu", "kashmir",
  "महाराष्ट्र", "maharashtra", "iit बॉम्बे", "iit bombay",
  "उत्तर प्रदेश", "uttar pradesh",
  "बिहार", "bihar",
  "राजस्थान", "rajasthan",
  "गुजरात", "gujarat",
  "पंजाब", "punjab",
  "हरियाणा", "haryana",
  "तमिलनाडु", "tamil nadu",
  "केरल", "kerala",
  "कर्नाटक", "karnataka",
  "झारखंड", "jharkhand",
  "देश-दुनिया", "राशिफल", "अंक ज्योतिष", "नाखून टूटने",
  "खाद्य तेल सस्ता होने का अनुमान"
];

const CG_DISTRICT_KEYS = new Set([
  "durg", "bhilai", "raipur", "rajnandgaon", "bilaspur", "korba", "raigarh",
  "bastar", "surguja", "jagdalpur", "ambikapur", "dhamtari", "mahasamund",
  "kanker", "sukma", "dantewada", "bijapur", "narayanpur", "kondagaon",
  "kabirdham", "balod", "bemetara", "gariaband", "balodabazar", "janjgir",
  "champa", "jashpur", "korea", "manendragarh", "mohla", "sakti",
  "sarangarh", "khairagarh",
]);

function isChhattisgarhOnlyStory(c) {
  const text = `${c.headline} ${c.summary || ""}`.toLowerCase();
  const hlLower = c.headline.toLowerCase();

  const hasCgMention =
    CG_TEXT_SIGNALS.some((sig) => text.includes(sig.toLowerCase())) ||
    (c.districtSlug && CG_DISTRICT_KEYS.has(c.districtSlug));

  if (!hasCgMention) return false;

  const hasExcludeSignal = EXCLUDE_SIGNALS.some((sig) => text.includes(sig.toLowerCase()));
  if (hasExcludeSignal) {
    const hlHasCg = CG_TEXT_SIGNALS.some((sig) => hlLower.includes(sig.toLowerCase()));
    if (!hlHasCg) return false;
  }

  if (hlLower.includes("देश-दुनिया") || hlLower.includes("राशिफल") || hlLower.includes("अंक ज्योतिष")) {
    return false;
  }

  return true;
}

async function run() {
  const now = Date.now();
  const cutoff = new Date(now - 48 * 3600 * 1000).toISOString();
  console.log(`Auditing articles published since: ${cutoff}`);

  const { data: rows, error } = await supabase
    .from("generated_articles")
    .select("id,slug,headline,summary,published_at,editorial_status,hero_image_url,tags")
    .not("published_at", "is", null)
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Query error:", error);
    return;
  }

  console.log(`Total published in last 48h in database: ${rows.length}`);

  let cgEligible = 0;
  let outsideRejected = 0;
  const eligibleStories = [];

  for (const r of rows) {
    const tags = r.tags || [];
    let districtSlug = tags.find((t) => t.startsWith("district:"))?.replace("district:", "")?.toLowerCase() || null;
    const item = {
      id: r.id,
      slug: r.slug,
      headline: r.headline,
      summary: r.summary,
      publishedAt: r.published_at,
      districtSlug,
    };
    if (isChhattisgarhOnlyStory(item)) {
      cgEligible++;
      eligibleStories.push(item);
    } else {
      outsideRejected++;
      console.log(`[REJECTED NON-CG] ${r.headline.slice(0, 60)}...`);
    }
  }

  // Deduplicate
  const seenSlugs = new Set();
  const deduped = [];
  for (const s of eligibleStories) {
    if (!seenSlugs.has(s.slug)) {
      seenSlugs.add(s.slug);
      deduped.push(s);
    }
  }

  console.log(`\n========================================`);
  console.log(`48h published stories examined: ${rows.length}`);
  console.log(`Chhattisgarh eligible: ${cgEligible}`);
  console.log(`Outside-state rejected: ${outsideRejected}`);
  console.log(`Deduped count: ${deduped.length}`);
  console.log(`Final broadcast eligible count: ${deduped.length}`);
  console.log(`========================================\n`);

  deduped.forEach((s, i) => {
    console.log(`${i + 1}. [${s.id}] ${s.headline}`);
  });
}

run().catch(console.error);
