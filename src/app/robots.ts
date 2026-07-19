import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/debug/",
        "/dashboard/",
        "/api/",
        "/system/",
        "/membership/paywall-preview",
      ],
    },
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
  };
}
