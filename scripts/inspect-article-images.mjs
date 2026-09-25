import { resolveLiveArticlePool } from "../src/lib/news/live-feed.ts";

async function check() {
  console.log("Checking live article pool...");
  try {
    const { rows } = await resolveLiveArticlePool(30, { select: "homepage" });
    console.log("Found rows:", rows.length);
    for (const r of rows.slice(0, 15)) {
      console.log({
        id: r.id,
        headline: r.headline?.slice(0, 40),
        image_url: r.image_url,
        hero_image: r.hero_image,
        editorial_image: r.editorial_metadata?.image_url,
      });
    }
  } catch (e) {
    console.error("resolveLiveArticlePool error:", e);
  }
}
check();
