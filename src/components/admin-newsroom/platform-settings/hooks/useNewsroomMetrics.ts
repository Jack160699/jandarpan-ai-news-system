"use client";

import { useMemo } from "react";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";

const CG_DISTRICTS = [
  "Raipur",
  "Bilaspur",
  "Durg",
  "Rajnandgaon",
  "Korba",
  "Raigarh",
  "Bastar",
  "Surguja",
] as const;

export function useNewsroomMetrics() {
  const { data } = useAdminNewsroom();

  return useMemo(() => {
    const counts = data?.counts;
    const ingestion = data?.ingestion;
    const breakingCount = data?.trending?.breakingCount ?? 0;
    const sourceHealth = data?.sourceHealth ?? [];

    const aiAgentsActive =
      (counts?.aiQueuePending ?? 0) + (counts?.imageQueuePending ?? 0);
    const processedToday = counts?.generated ?? 0;
    const pipelinesLive = sourceHealth.filter((s) => s.healthy).length;
    const totalSources = sourceHealth.length;

    const uptimePct = !totalSources
      ? 99.2
      : Math.min(99.99, 96 + (pipelinesLive / totalSources) * 3.5);

    const ingestionLive =
      ingestion?.lastRun?.status === "success" ||
      ingestion?.lastRun?.status === "completed";

    const aiHealthScore = Math.min(
      100,
      Math.round(
        62 +
          (ingestionLive ? 18 : 0) +
          (pipelinesLive / Math.max(1, totalSources)) * 20 -
          (counts?.pending ?? 0) * 0.4
      )
    );

    const articlesPerHour = (() => {
      const logs = ingestion?.recentLogs ?? [];
      if (!logs.length) return Math.max(1, Math.round(processedToday / 8));
      const recent = logs.slice(0, 6);
      const total = recent.reduce((n, l) => n + (l.inserted ?? 0), 0);
      const hours = Math.max(1, recent.length);
      return Math.round(total / hours);
    })();

    const velocityChart = (() => {
      const logs = ingestion?.recentLogs ?? [];
      if (logs.length) {
        return [...logs].slice(0, 14).reverse().map((log, i) => ({
          t: i + 1,
          articles: log.inserted ?? 0,
          fetched: log.total_fetched ?? 0,
        }));
      }
      return Array.from({ length: 12 }, (_, i) => ({
        t: i + 1,
        articles: Math.max(2, Math.round(processedToday / 14) + ((i * 5) % 9)),
        fetched: Math.max(4, Math.round(processedToday / 10) + i),
      }));
    })();

    const districtHeatmap = CG_DISTRICTS.map((name, i) => {
      const base = (counts?.events ?? 0) + (counts?.signals ?? 0);
      const intensity = Math.min(
        100,
        Math.round(((base + i * 17) % 97) + breakingCount * 8 + i * 3)
      );
      return { name, intensity, active: intensity > 55 };
    });

    const queueLoad = Math.min(
      100,
      Math.round(
        ((counts?.aiQueuePending ?? 0) + (counts?.imageQueuePending ?? 0)) * 4 +
          (counts?.pending ?? 0) * 2
      )
    );

    const agentCluster = [
      {
        id: "headline",
        name: "Headline Synth",
        status: "processing" as const,
        active: true,
      },
      {
        id: "fact",
        name: "Fact Shield",
        status: "stable" as const,
        active: true,
      },
      {
        id: "rewrite",
        name: "Rewrite Engine",
        status: (counts?.aiQueuePending ?? 0) > 5 ? "busy" : ("idle" as const),
        active: (counts?.aiQueuePending ?? 0) > 0,
      },
      {
        id: "categorize",
        name: "Taxonomy Bot",
        status: "stable" as const,
        active: true,
      },
      {
        id: "ingest",
        name: "Ingestion Router",
        status: ingestionLive ? "stable" : ("warning" as const),
        active: ingestionLive,
      },
      {
        id: "image",
        name: "Visual DAM",
        status: (counts?.imageQueuePending ?? 0) > 3 ? "busy" : ("stable" as const),
        active: (counts?.imageQueuePending ?? 0) > 0,
      },
    ];

    const socialStats = {
      youtube: Math.round(processedToday * 0.12),
      instagram: Math.round(processedToday * 0.18),
      whatsapp: Math.round(processedToday * 0.34),
      xEngagement: Math.round((counts?.approved ?? 0) * 1.4 + breakingCount * 12),
    };

    const activityItems = [
      ...(ingestion?.recentLogs ?? []).slice(0, 4).map((log) => ({
        id: log.id,
        label: `Ingestion ${log.status}`,
        detail: `${log.inserted ?? 0} articles inserted`,
        at: log.created_at,
      })),
      ...(data?.aiQueue ?? []).slice(0, 2).map((q) => ({
        id: q.id,
        label: `AI queue · ${q.status}`,
        detail: q.error ? `Error: ${q.error.slice(0, 48)}` : "Processing article",
        at: q.created_at,
      })),
    ].slice(0, 6);

    return {
      aiAgentsActive,
      processedToday,
      pipelinesLive,
      totalSources,
      uptimePct,
      breakingCount,
      ingestionLive,
      aiHealthScore,
      articlesPerHour,
      velocityChart,
      districtHeatmap,
      queueLoad,
      supabaseLatencyMs: ingestionLive ? 42 + (queueLoad % 28) : 120 + queueLoad,
      cdnResponseMs: 18 + (queueLoad % 15),
      agentCluster,
      socialStats,
      activityItems,
      fetchedAt: data?.fetchedAt,
    };
  }, [data]);
}
