import type { MetadataRoute } from "next";
import { buildMainSitemap } from "@/lib/seo/sitemap-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildMainSitemap();
}
