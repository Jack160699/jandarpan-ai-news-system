/**
 * AI Editorial Copilot — orchestrator
 */

import { buildExecutiveDashboard } from "@/lib/ai-copilot/aggregator";
import { collectRecommendationDrafts } from "@/lib/ai-copilot/recommendation-engine";
import { generateDailyBriefing } from "@/lib/ai-copilot/reports";
import { logCopilot } from "@/lib/ai-copilot/logger";
import {
  listRecommendations,
  listRecentReports,
  saveReport,
  syncRecommendations,
} from "@/lib/ai-copilot/repository";
import { isAiCopilotEnabled } from "@/lib/ai-copilot/config";
import type { CopilotDashboard } from "@/lib/ai-copilot/types";

export async function loadCopilotDashboard(
  options: { sync?: boolean } = {}
): Promise<CopilotDashboard> {
  if (!isAiCopilotEnabled()) {
    return {
      executive: await buildExecutiveDashboard(),
      priorityQueue: [],
      recentReports: [],
      enabled: false,
    };
  }

  if (options.sync !== false) {
    const drafts = await collectRecommendationDrafts();
    const synced = await syncRecommendations(drafts);
    logCopilot("recommendations_synced", { count: synced });

    const today = new Date().toISOString().slice(0, 10);
    const reports = await listRecentReports(1);
    const hasTodayBriefing = reports.some(
      (r) => r.report_type === "daily_briefing" && r.generated_at.startsWith(today)
    );
    if (!hasTodayBriefing) {
      const briefing = await generateDailyBriefing();
      await saveReport(briefing);
      logCopilot("report_generated", { type: "daily_briefing" });
    }
  }

  const [executive, priorityQueue, recentReports] = await Promise.all([
    buildExecutiveDashboard(),
    listRecommendations(25),
    listRecentReports(5),
  ]);

  logCopilot("dashboard_loaded", {
    recommendations: priorityQueue.length,
  });

  return {
    executive,
    priorityQueue,
    recentReports: recentReports as CopilotDashboard["recentReports"],
    enabled: true,
  };
}
