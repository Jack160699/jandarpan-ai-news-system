/**
 * Phase 9C.2 — lightweight launch readiness signals for admin widgets
 */

import {
  auditTranslationCoverage,
  isCgTranslationEnabled,
  resolveTranslationHealth,
} from "@/lib/i18n/multilingual/translation-queue";
import { countPendingAiQueue } from "@/lib/news/ai/queue";
import { countPendingEditorialImages } from "@/lib/news/ai/generate-editorial-image";
import { getRssHealthDashboard } from "@/lib/news/rss-health";
import { getCronMonitorState } from "@/lib/observability/cron-monitor";
import { getQueueAnalyticsDashboard } from "@/lib/observability/queue-analytics";
import { buildMainSitemap } from "@/lib/seo/sitemap-data";
import {
  isRequiredPathInSitemap,
  REQUIRED_SITEMAP_PATHS,
} from "@/lib/seo/sitemap-paths";
import { SITE_URL } from "@/lib/seo/constants";
import { isSupabaseConfigured } from "@/lib/supabase";

export type LaunchHealthLevel = "healthy" | "degraded" | "unhealthy";

export type LaunchHealthWidget = {
  id: string;
  label: string;
  status: LaunchHealthLevel;
  detail: string;
};

function level(ok: boolean, degraded?: boolean): LaunchHealthLevel {
  if (!ok) return "unhealthy";
  if (degraded) return "degraded";
  return "healthy";
}

function formatTranslationDetail(
  coverage: Awaited<ReturnType<typeof auditTranslationCoverage>>
): string {
  const parts = [
    `Backlog ${coverage.backlogTotal}`,
    `hi→en ${coverage.hiMissingEn}`,
  ];
  if (isCgTranslationEnabled()) {
    parts.push(`hi→cg ${coverage.hiMissingCg}`);
  }
  parts.push(`en→hi ${coverage.enMissingHi}`, `pending ${coverage.queuePending}`);
  return parts.join(" · ");
}

export async function getLaunchHealthWidgets(): Promise<LaunchHealthWidget[]> {
  const widgets: LaunchHealthWidget[] = [];

  if (!isSupabaseConfigured()) {
    return [
      {
        id: "platform",
        label: "Platform",
        status: "degraded",
        detail: "Supabase not configured",
      },
    ];
  }

  try {
    const coverage = await auditTranslationCoverage();
    const tStatus = resolveTranslationHealth(coverage);
    widgets.push({
      id: "translation",
      label: "Translation queue",
      status: tStatus,
      detail: formatTranslationDetail(coverage),
    });
  } catch {
    widgets.push({
      id: "translation",
      label: "Translation queue",
      status: "unhealthy",
      detail: "Audit failed",
    });
  }

  try {
    const [aiPending, imagePending] = await Promise.all([
      countPendingAiQueue(),
      countPendingEditorialImages(),
    ]);
    widgets.push({
      id: "image",
      label: "Image queue",
      status: level(imagePending < 200, imagePending >= 50),
      detail: `${imagePending} editorial images pending`,
    });
    widgets.push({
      id: "editorial",
      label: "Editorial queue",
      status: level(aiPending < 300, aiPending >= 80),
      detail: `${aiPending} AI jobs pending`,
    });
  } catch {
    widgets.push({
      id: "editorial",
      label: "Editorial queue",
      status: "unknown" as LaunchHealthLevel,
      detail: "Queue counts unavailable",
    });
  }

  try {
    const analytics = await getQueueAnalyticsDashboard();
    const dead = analytics.editorial.deadJobs + analytics.ai.dead;
    widgets.push({
      id: "workers",
      label: "Worker health",
      status: level(dead === 0, dead > 0 && dead < 5),
      detail: dead > 0 ? `${dead} dead jobs` : "Queues draining",
    });
  } catch {
    widgets.push({
      id: "workers",
      label: "Worker health",
      status: "degraded",
      detail: "Analytics unavailable",
    });
  }

  try {
    const cron = await getCronMonitorState();
    const stale = cron.staleJobs?.length ?? 0;
    widgets.push({
      id: "cron",
      label: "Cron health",
      status: level(stale === 0, stale > 0 && stale < 3),
      detail: stale > 0 ? `${stale} stale cron jobs` : "Schedules on track",
    });
  } catch {
    widgets.push({
      id: "cron",
      label: "Cron health",
      status: "degraded",
      detail: "Cron monitor unavailable",
    });
  }

  try {
    const rss = await getRssHealthDashboard();
    const healthy = rss.filter((s) => s.healthy).length;
    const total = rss.length;
    widgets.push({
      id: "rss",
      label: "RSS health",
      status: level(
        total === 0 || healthy >= Math.ceil(total * 0.6),
        healthy < total && healthy >= Math.ceil(total * 0.4)
      ),
      detail: `${healthy}/${total} sources healthy`,
    });
  } catch {
    widgets.push({
      id: "rss",
      label: "RSS health",
      status: "degraded",
      detail: "RSS health unavailable",
    });
  }

  try {
    const sitemap = await buildMainSitemap();
    const sitemapUrls = sitemap.map((e) => e.url);
    const missing = REQUIRED_SITEMAP_PATHS.filter(
      (path) => !isRequiredPathInSitemap(SITE_URL, path, sitemapUrls)
    );
    widgets.push({
      id: "sitemap",
      label: "Sitemap health",
      status: level(missing.length === 0, missing.length > 0 && missing.length <= 2),
      detail:
        missing.length === 0
          ? `${sitemap.length} URLs indexed`
          : `Missing ${missing.length}: ${missing.slice(0, 3).join(", ")}`,
    });
  } catch {
    widgets.push({
      id: "sitemap",
      label: "Sitemap health",
      status: "degraded",
      detail: "Sitemap build failed",
    });
  }

  widgets.push({
    id: "search",
    label: "Search health",
    status: isSupabaseConfigured() ? "healthy" : "degraded",
    detail: isSupabaseConfigured()
      ? "Search API and indexer available"
      : "Search degraded without database",
  });

  return widgets;
}
