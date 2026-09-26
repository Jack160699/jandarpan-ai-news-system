import { isCleanRightsEligibleMedia } from "../src/lib/news/images/validate.ts";
import { execSync } from "node:child_process";

async function inspectGeneratedArticles() {
  const raw = execSync('npx supabase db query --linked "SELECT id, slug, headline, published_at, hero_image_url, editorial_metadata, tags FROM generated_articles WHERE published_at IS NOT NULL ORDER BY published_at DESC;" -o json', { encoding: 'utf-8' });
  const parsed = JSON.parse(raw);
  const rows = parsed.rows || [];
  
  console.log(`Found ${rows.length} published generated_articles:`);
  for (const r of rows) {
    const img = r.hero_image_url || r.editorial_metadata?.image_url;
    const isClean = isCleanRightsEligibleMedia(img);
    const pubDate = new Date(r.published_at);
    const ageDays = (Date.now() - pubDate.getTime()) / (24 * 3600 * 1000);
    console.log(`- [${r.id.slice(0, 8)}] age=${ageDays.toFixed(1)}d | cleanImg=${isClean} | headline="${r.headline.slice(0, 50)}..." | img=${img?.slice(0, 60)}`);
  }
}

inspectGeneratedArticles().catch(console.error);
