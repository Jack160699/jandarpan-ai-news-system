import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { buildHyperlocalFeedBundle } from "@/lib/regional/hyperlocal-feed";

async function check() {
  const pool = await fetchGeneratedArticlePool(100, { select: "homepage" });
  console.log("Total pool rows:", pool.length);
  const bundle = buildHyperlocalFeedBundle(pool);
  let totalRefs = 0;
  let withImg = 0;
  let withoutImg = 0;

  for (const f of bundle.feeds) {
    for (const a of f.articles) {
      totalRefs++;
      if (a.imageUrl) withImg++;
      else withoutImg++;
    }
  }

  console.log(`Hyperlocal bundle articles: Total=${totalRefs}, WithImg=${withImg}, WithoutImg=${withoutImg}`);
}

check().catch(console.error);
