import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

let envFile = ".env.production.local";
if (!fs.existsSync(envFile)) envFile = ".env.production.real";
if (!fs.existsSync(envFile)) envFile = ".env.local";
const env = dotenv.parse(fs.readFileSync(envFile, "utf8"));
const clean = (s) => (s ? s.replace(/^["']+|["']+$/g, "").trim() : "");
const url = clean(env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
const key = clean(env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(url, key);

async function check() {
  const d30Ago = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("generated_articles")
    .select("id, headline, language, translations, editorial_metadata")
    .gte("published_at", d30Ago)
    .order("published_at", { ascending: false })
    .limit(20);
  
  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Sample 30d articles count:", data?.length);
  let hasEnCount = 0;
  for (const a of data || []) {
    const colTrans = a.translations;
    const metaTrans = a.editorial_metadata?.translations;
    const enTrans = colTrans?.en || metaTrans?.en;
    if (enTrans?.headline) hasEnCount++;
    console.log("ID:", a.id, "Lang:", a.language, "Headline:", a.headline?.slice(0, 35));
    console.log("  hasEnTrans:", Boolean(enTrans?.headline), "enHeadline:", enTrans?.headline?.slice(0, 40));
  }
  console.log(`Summary: ${hasEnCount} / ${data.length} have English translation.`);
}
check();
