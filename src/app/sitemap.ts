import type { MetadataRoute } from "next";
import { buildMainSitemap } from "@/lib/seo/sitemap-data";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildMainSitemap();
}
