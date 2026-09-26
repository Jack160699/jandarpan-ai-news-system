import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (v && (!process.env[key] || process.env[key] === "")) {
      process.env[key] = v;
    }
  }
}

loadEnvFile(".env.production.local");
loadEnvFile(".env.production.real");
loadEnvFile(".env.local");

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/^["']+|["']+$/g, "").trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/^["']+|["']+$/g, "").trim();

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Import or copy clean media validation rules
const STOCK_MEDIA_RE = /unsplash\.com|pexels\.com|pixabay\.com|shutterstock\.com|gettyimages\.com|istockphoto\.com|freepik\.com|stock\.adobe\.com/i;
const AI_PLACEHOLDER_RE = /midjourney|dall-e|stability\.ai|dreamstudio|ai-generated|newsroom-desk|raipur-city-ai/i;
const THIRD_PARTY_BRANDED_OR_TEMPLATE_RE = /amarujala|ibc24|dainik-?bhaskar|bhaskar\.com|aajtak|zeenews|abplive|ndtv\.com|news18|republicworld|tv9hindi|tv9|etvbharat|haribhoomi|patrika\.com|kpnews|ytimg\.com|youtube\.com.*thumbnail|debate-template|tv-?anchor|news-?anchor|anchor-?desk|studio-?screen|studio-?anchor|presenter-frame|pti_cg[0-9]|shah-mat|01101010|Shah-Mat|Balod-Road-Accident|CG-Teacher-Suspended|Rajnandgaon-Ganesh-Jhanki-Cancel|images-1-4|(?:watermark|channel-?bug|lower-?third|masthead|bulletin-?graphic|breaking-?news-?(?:template|live|banner|graphic)|overlay-?graphic|broadcast-?bug|station-?logo)/i;
const BRAND_ASSET_RE = /\/brand\/|jan-darpan[-_](chhattisgarh[-_])?(logo|mark|og|icon)|jandarpan[-_](logo|mark|og)|social[-_]?lockup/i;
const PLACEHOLDER_RE = /placeholder|placehold\.co|via\.placeholder|default\.(jpg|png|gif)|no-?image|1x1|pixel\.|spacer\.|blank\.|dummy|data:image|about:blank/i;

function isCleanMedia(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  const lower = trimmed.toLowerCase();
  if (STOCK_MEDIA_RE.test(lower)) return false;
  if (AI_PLACEHOLDER_RE.test(lower)) return false;
  if (THIRD_PARTY_BRANDED_OR_TEMPLATE_RE.test(lower)) return false;
  if (BRAND_ASSET_RE.test(lower)) return false;
  if (PLACEHOLDER_RE.test(lower)) return false;
  return true;
}

async function main() {
  console.log("Fetching events and their signals...");
  const { data: events, error: eventErr } = await supabase
    .from("news_events")
    .select("id, title, region, category, signal_ids, created_at")
    .order("created_at", { ascending: false });

  if (eventErr) {
    console.error("Event fetch error:", eventErr);
    return;
  }

  console.log(`Total news_events: ${events.length}`);

  // Fetch signals
  const { data: signals, error: sigErr } = await supabase
    .from("news_signals")
    .select("id, title, image_url, source_domain, region, category, created_at");

  if (sigErr) {
    console.error("Signal fetch error:", sigErr);
    return;
  }

  console.log(`Total news_signals: ${signals.length}`);

  const signalMap = new Map();
  for (const s of signals) {
    signalMap.set(s.id, s);
  }

  let eventsWithAnyImage = 0;
  let eventsWithCleanRealImage = 0;
  const sourceDomainsWithCleanImages = {};

  for (const e of events) {
    const eSignals = (e.signal_ids || []).map(id => signalMap.get(id)).filter(Boolean);
    let hasAny = false;
    let hasClean = false;

    for (const s of eSignals) {
      if (s.image_url && s.image_url.trim() !== "") {
        hasAny = true;
        if (isCleanMedia(s.image_url)) {
          hasClean = true;
          const domain = s.source_domain || "unknown";
          sourceDomainsWithCleanImages[domain] = (sourceDomainsWithCleanImages[domain] || 0) + 1;
          break;
        }
      }
    }

    if (hasAny) eventsWithAnyImage++;
    if (hasClean) eventsWithCleanRealImage++;
  }

  console.log(`Events with ANY signal image: ${eventsWithAnyImage}`);
  console.log(`Events with CLEAN real photojournalism image: ${eventsWithCleanRealImage}`);
  console.log("Source domains of clean media:", sourceDomainsWithCleanImages);
}

main().catch(console.error);
