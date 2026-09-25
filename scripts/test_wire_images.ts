import { getStaticFallbackArticlePool } from "@/lib/news/fallback/wire-articles";

const pool = getStaticFallbackArticlePool();
console.log("Total static fallback articles:", pool.length);
const withImg = pool.filter((r) => !!r.hero_image_url);
console.log("With hero_image_url:", withImg.length);
const withoutImg = pool.filter((r) => !r.hero_image_url);
console.log("Without hero_image_url:", withoutImg.length);
if (withoutImg.length > 0) {
  console.log("Sample without image:", withoutImg.slice(0, 5).map((r) => ({ id: r.id, headline: r.headline.slice(0, 40) })));
}
