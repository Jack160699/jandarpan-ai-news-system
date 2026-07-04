/**
 * Tenant-scoped editorial actions with audit logging
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  disableRssSource,
  enableRssSource,
  manualPublishArticle,
  setArticleBreaking,
  setArticleEditorialStatus,
  setArticleFeatured,
  setHomepagePin,
  updateArticleHeadline,
} from "@/lib/editorial-dashboard/actions";
import {
  queueArticleImageRegeneration,
  regenerateGeneratedArticle,
} from "@/lib/editorial-dashboard/regenerate";
import { logEditorialAudit } from "@/lib/dashboard/audit";
import { asJsonObject } from "@/types/json";
import type { DashboardSession } from "@/lib/saas-auth/types";

async function assertArticleInTenant(
  articleId: string,
  tenantId: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("generated_articles")
    .select("id, tenant_id")
    .eq("id", articleId)
    .maybeSingle();

  if (!data) return false;
  if (!data.tenant_id) return true;
  return data.tenant_id === tenantId;
}

export async function runDashboardAction(
  session: DashboardSession,
  action: string,
  body: Record<string, string | number | boolean | undefined>
): Promise<{ ok: boolean; message?: string }> {
  const tenantId = session.membership.tenantId;
  const articleId = body.articleId as string | undefined;

  if (articleId) {
    const allowed = await assertArticleInTenant(articleId, tenantId);
    if (!allowed) {
      return { ok: false, message: "Article not in your newsroom" };
    }
  }

  let result: { ok: boolean; message?: string };

  switch (action) {
    case "approve":
      result = await setArticleEditorialStatus(articleId!, tenantId, "approved");
      break;
    case "reject":
      result = await setArticleEditorialStatus(articleId!, tenantId, "rejected");
      break;
    case "manual_publish":
      result = await manualPublishArticle(articleId!, tenantId);
      break;
    case "pin":
      result = await setHomepagePin(articleId!, tenantId, true);
      break;
    case "unpin":
      result = await setHomepagePin(articleId!, tenantId, false);
      break;
    case "feature":
      result = await setArticleFeatured(articleId!, tenantId, true);
      break;
    case "unfeature":
      result = await setArticleFeatured(articleId!, tenantId, false);
      break;
    case "update_headline":
      result = await updateArticleHeadline(
        articleId!,
        tenantId,
        String(body.headline ?? "")
      );
      break;
    case "mark_breaking":
      result = await setArticleBreaking(articleId!, tenantId, true);
      break;
    case "unmark_breaking":
      result = await setArticleBreaking(articleId!, tenantId, false);
      break;
    case "regenerate_article":
      result = await regenerateGeneratedArticle(articleId!, tenantId);
      break;
    case "regenerate_image":
      result = await queueArticleImageRegeneration(articleId!, tenantId);
      break;
    case "disable_rss":
      result = await disableRssSource(
        String(body.sourceId),
        Number(body.hours ?? 48)
      );
      break;
    case "enable_rss":
      result = await enableRssSource(String(body.sourceId));
      break;
    default:
      return { ok: false, message: "Unknown action" };
  }

  if (result.ok) {
    await logEditorialAudit({
      session,
      action,
      resourceId: articleId ?? (body.sourceId as string),
      payload: asJsonObject(body as Record<string, unknown>),
    });
  }

  return result;
}
