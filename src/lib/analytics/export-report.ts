import type { EnterpriseAnalyticsReport } from "@/lib/analytics/types";

export function reportToCsv(report: EnterpriseAnalyticsReport): string {
  const lines: string[] = [
    `# Jan Darpan Analytics Export`,
    `# Generated: ${report.fetchedAt}`,
    `# Window: ${report.windowHours}h`,
    "",
    "## Summary",
    "metric,value",
    `total_views,${report.summary.totalViews}`,
    `total_clicks,${report.summary.totalClicks}`,
    `overall_ctr,${report.summary.overallCtr}`,
    `avg_read_sec,${report.summary.avgReadTimeSec}`,
    `avg_scroll_depth,${report.summary.avgScrollDepth}`,
    `active_readers,${report.liveReaders.activeReaders}`,
    "",
    "## Top Articles",
    "rank,slug,headline,views,ctr,engagement_score,rank_score",
  ];

  for (const a of report.rankedArticles.slice(0, 50)) {
    lines.push(
      [
        a.rank,
        escapeCsv(a.slug),
        escapeCsv(a.headline),
        a.views,
        a.ctr.toFixed(4),
        a.engagementScore,
        a.rankScore,
      ].join(",")
    );
  }

  lines.push("", "## District Engagement", "district,views,clicks,ctr,engagement");
  for (const d of report.districtEngagement) {
    lines.push(
      [escapeCsv(d.district), d.views, d.clicks, d.ctr.toFixed(4), d.engagementScore].join(
        ","
      )
    );
  }

  return lines.join("\n");
}

export function reportToJson(report: EnterpriseAnalyticsReport): string {
  return JSON.stringify(report, null, 2);
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
