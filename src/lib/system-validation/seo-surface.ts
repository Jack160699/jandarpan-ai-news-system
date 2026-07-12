/**
 * SEO surface validation — sitemap, robots, schema, metadata
 */

import { existsSync } from "fs";
import { join } from "path";
import { buildMainSitemap, buildGoogleNewsEntries } from "@/lib/seo/sitemap-data";
import { REQUIRED_SITEMAP_PATHS } from "@/lib/seo/sitemap-paths";
import { SITE_URL } from "@/lib/seo/constants";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { VALIDATION_FETCH_TIMEOUT_MS } from "@/lib/system-validation/config";
import type { ValidationModuleResult } from "@/lib/system-validation/types";

async function timedModule(
  moduleId: string,
  label: string,
  category: ValidationModuleResult["category"],
  fn: () => Promise<Omit<ValidationModuleResult, "moduleId" | "label" | "category" | "latencyMs">>
): Promise<ValidationModuleResult> {
  const start = Date.now();
  try {
    const result = await fn();
    return {
      moduleId,
      label,
      category,
      latencyMs: Date.now() - start,
      ...result,
    };
  } catch (err) {
    return {
      moduleId,
      label,
      category,
      status: "fail",
      message: err instanceof Error ? err.message : "validation_failed",
      latencyMs: Date.now() - start,
    };
  }
}

async function fetchText(url: string): Promise<{ ok: boolean; text: string; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VALIDATION_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    const text = await res.text();
    return { ok: res.ok, text, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

export async function validateSeoSurface(): Promise<ValidationModuleResult[]> {
  const base = SITE_URL.replace(/\/$/, "");

  return Promise.all([
    timedModule("sitemap", "Sitemap", "indexing", async () => {
      const sitemap = await buildMainSitemap();
      const urls = new Set(sitemap.map((e) => e.url.replace(/\/$/, "")));
      const missing = REQUIRED_SITEMAP_PATHS.filter(
        (path) => !urls.has(`${base}${path}`)
      );
      return {
        status: missing.length === 0 ? "pass" : missing.length <= 2 ? "warn" : "fail",
        message:
          missing.length === 0
            ? `${sitemap.length} URLs`
            : `Missing paths: ${missing.join(", ")}`,
        details: { urlCount: sitemap.length, missing },
      };
    }),

    timedModule("news_sitemap", "News Sitemap", "indexing", async () => {
      const entries = await buildGoogleNewsEntries();
      return {
        status: entries.length > 0 ? "pass" : "warn",
        message: `${entries.length} Google News entries`,
        details: { count: entries.length },
      };
    }),

    timedModule("robots_txt", "robots.txt", "indexing", async () => {
      const res = await fetchText(`${base}/robots.txt`);
      const hasSitemap = res.text.includes("sitemap");
      const disallowsAdmin = res.text.includes("Disallow: /admin");
      return {
        status: res.ok && hasSitemap && disallowsAdmin ? "pass" : "warn",
        message: res.ok ? "robots.txt reachable" : `HTTP ${res.status}`,
        details: { hasSitemap, disallowsAdmin },
      };
    }),

    timedModule("schema_org", "schema.org", "seo", async () => {
      if (!isSupabaseConfigured()) {
        return { status: "skip", message: "supabase_not_configured" };
      }
      const { data } = await createAdminServerClient()
        .from("generated_articles")
        .select("editorial_metadata, headline")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const meta = (data as { editorial_metadata?: Record<string, unknown> } | null)
        ?.editorial_metadata;
      const hasFaq = Boolean(meta?.faq_schema || meta?.faq);
      return {
        status: hasFaq ? "pass" : "warn",
        message: hasFaq ? "FAQ schema present on latest article" : "No FAQ schema on latest article",
      };
    }),

    timedModule("metadata", "Metadata", "seo", async () => {
      if (!isSupabaseConfigured()) return { status: "skip", message: "no_db" };
      const { data } = await createAdminServerClient()
        .from("generated_articles")
        .select("seo_title, seo_description")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(10);

      const rows = (data ?? []) as Array<{
        seo_title: string | null;
        seo_description: string | null;
      }>;
      const missing = rows.filter((r) => !r.seo_title || !r.seo_description).length;
      return {
        status: missing === 0 ? "pass" : missing <= 2 ? "warn" : "fail",
        message: `${rows.length - missing}/${rows.length} articles have full metadata`,
        details: { missing },
      };
    }),

    timedModule("opengraph", "OpenGraph", "seo", async () => {
      if (!isSupabaseConfigured()) return { status: "skip", message: "no_db" };
      const { data } = await createAdminServerClient()
        .from("generated_articles")
        .select("editorial_metadata")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(5)
        .maybeSingle();

      const meta = (data as { editorial_metadata?: Record<string, unknown> } | null)
        ?.editorial_metadata;
      const hasOg = Boolean(meta?.og_title || meta?.og_description);
      return {
        status: hasOg ? "pass" : "warn",
        message: hasOg ? "OG tags configured" : "OG tags missing on sample",
      };
    }),

    timedModule("canonical", "Canonical URLs", "seo", async () => {
      const res = await fetchText(`${base}/`);
      const hasCanonical =
        res.text.includes('rel="canonical"') || res.text.includes("rel='canonical'");
      return {
        status: hasCanonical ? "pass" : "warn",
        message: hasCanonical ? "Canonical link found on homepage" : "No canonical on homepage",
      };
    }),

    timedModule("internal_links", "Internal Links", "seo", async () => {
      if (!isSupabaseConfigured()) return { status: "skip", message: "no_db" };
      const { data } = await createAdminServerClient()
        .from("generated_articles")
        .select("editorial_metadata")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(20);

      const withLinks = ((data ?? []) as Array<{ editorial_metadata: Record<string, unknown> }>).filter(
        (r) => Array.isArray(r.editorial_metadata?.related_slugs) &&
          (r.editorial_metadata.related_slugs as string[]).length > 0
      ).length;

      return {
        status: withLinks >= 5 ? "pass" : withLinks > 0 ? "warn" : "fail",
        message: `${withLinks}/20 recent articles have related links`,
        details: { withLinks },
      };
    }),

    timedModule("production_build", "Production Build", "performance", async () => {
      const buildIdPath = join(process.cwd(), ".next", "BUILD_ID");
      const exists = existsSync(buildIdPath);
      return {
        status: exists ? "pass" : process.env.NODE_ENV === "development" ? "skip" : "warn",
        message: exists ? "Build artifact present" : "No .next/BUILD_ID — run npm run build",
      };
    }),

    timedModule("accessibility", "Accessibility", "publishing", async () => {
      const res = await fetchText(`${base}/`);
      const hasLang = /<html[^>]+lang=/i.test(res.text);
      const hasMain = /<main/i.test(res.text);
      return {
        status: hasLang && hasMain ? "pass" : "warn",
        message: `lang=${hasLang}, main=${hasMain}`,
      };
    }),
  ]);
}
