import type { MetadataRoute } from "next";
import { getGeneratedArticleSlugs } from "@/lib/newsroom/generated/read";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "always",
      priority: 1,
    },
    {
      url: `${SITE_URL}/archive`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  let live: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getGeneratedArticleSlugs(800);
    live = slugs.map((slug) => ({
      url: `${SITE_URL}/story/${slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.85,
    }));
  } catch {
    /* Supabase optional at build */
  }

  return [...staticRoutes, ...live];
}
