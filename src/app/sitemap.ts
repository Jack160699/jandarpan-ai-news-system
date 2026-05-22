import type { MetadataRoute } from "next";
import { getLiveStorySlugs } from "@/lib/news-db";
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
  ];

  let live: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getLiveStorySlugs(800);
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
