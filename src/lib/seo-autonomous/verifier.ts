/**
 * Stage 6 — Verification after execution
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { loadArticleSnapshot } from "@/lib/seo-execution/apply-engine";
import type { SeoAction } from "@/lib/seo-autonomous/types";
import { logAutonomous } from "@/lib/seo-autonomous/logger";

export interface VerificationResult {
  ok: boolean;
  checks: Array<{ name: string; passed: boolean; detail?: string }>;
}

export async function verifyAction(action: SeoAction): Promise<VerificationResult> {
  const checks: VerificationResult["checks"] = [];

  if (!isSupabaseConfigured()) {
    return { ok: false, checks: [{ name: "supabase", passed: false }] };
  }

  const snapshot = await loadArticleSnapshot(action.article_id);
  checks.push({
    name: "database_updated",
    passed: !!snapshot,
    detail: snapshot ? "article found" : "article missing",
  });

  if (snapshot) {
    if (action.field_key === "seo_title") {
      checks.push({
        name: "metadata_valid",
        passed: snapshot.seo_title === action.suggested_value,
        detail: `expected seo_title match`,
      });
    } else if (action.field_key === "seo_description") {
      checks.push({
        name: "metadata_valid",
        passed: snapshot.seo_description === action.suggested_value,
      });
    } else if (action.field_key === "faq_schema") {
      try {
        const hasFaq =
          !!snapshot.editorial_metadata.faq_schema ||
          !!snapshot.editorial_metadata.faq;
        checks.push({
          name: "schema_valid",
          passed: hasFaq,
          detail: "FAQ schema present",
        });
      } catch {
        checks.push({ name: "schema_valid", passed: false });
      }
    } else if (action.field_key === "related_slugs") {
      const slugs = snapshot.editorial_metadata.related_slugs;
      checks.push({
        name: "internal_links",
        passed: Array.isArray(slugs) && slugs.length > 0,
      });
    } else {
      const metaKey =
        action.field_key.startsWith("og_") || action.field_key.startsWith("twitter_")
          ? action.field_key
          : action.field_key === "image_alt"
            ? "image"
            : action.field_key;
      checks.push({
        name: "metadata_valid",
        passed: metaKey in snapshot.editorial_metadata || metaKey === "image",
      });
    }
  }

  if (action.field_key === "related_slugs") {
    try {
      const links = JSON.parse(action.suggested_value) as Array<{ slug: string }>;
      const supabase = createAdminServerClient();
      for (const link of links.slice(0, 5)) {
        const { data } = await supabase
          .from("generated_articles")
          .select("id")
          .eq("slug", link.slug)
          .maybeSingle();
        checks.push({
          name: `link_${link.slug}`,
          passed: !!data,
          detail: data ? "valid" : "broken",
        });
      }
    } catch {
      checks.push({ name: "link_parse", passed: false });
    }
  }

  const ok = checks.every((c) => c.passed);
  logAutonomous("verify_complete", {
    actionId: action.id,
    ok,
    passed: checks.filter((c) => c.passed).length,
    total: checks.length,
  });

  return { ok, checks };
}
