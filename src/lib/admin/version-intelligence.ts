/**
 * Version Intelligence — read-only article evolution projection.
 * Pure metadata; no version history, no queries, no network calls.
 */

import type { EventViewModel } from "@/lib/events/event-view-model";
import type { EditorArticleRecord } from "@/lib/editorial-editor/types";
import {
  WORKFLOW_LABELS,
  WORKFLOW_STATUSES,
  type WorkflowStatus,
} from "@/lib/editorial-workflow/types";
import type { EditorialQualityReport } from "@/lib/news/ai/editorial-guards";
import { formatNewsDate } from "@/lib/i18n/format";
import { resolveEditorialChangeHistorySummary } from "@/lib/story/editorial-trust";
import type { EditorialMetadata, GeneratedArticleRow } from "@/lib/types/newsroom";

export type VersionIntelligenceVm = {
  originalGeneration: string | null;
  regenerationDetected: string | null;
  editorialRepair: string | null;
  translationUpdate: string | null;
  confidenceEvolution: string | null;
  eventLinkage: string | null;
  currentVersionState: string | null;
  latestModification: string | null;
  latestModificationIso: string | null;
  versionSummary: string | null;
  hasLayer: boolean;
};

export type BuildVersionIntelligenceInput = {
  article: EditorArticleRecord;
  meta: EditorialMetadata;
  generatedRow: GeneratedArticleRow;
  eventViewModel?: EventViewModel | null;
};

function isWorkflowStatus(value: string): value is WorkflowStatus {
  return (WORKFLOW_STATUSES as readonly string[]).includes(value);
}

function normalizeWorkflowStatus(
  status: string | null | undefined
): WorkflowStatus | null {
  const normalized = status?.trim().toLowerCase() ?? "";
  if (!normalized) return null;
  return isWorkflowStatus(normalized) ? normalized : null;
}

function formatTimestampLine(
  iso: string | null | undefined,
  prefix: string
): string | null {
  if (!iso?.trim()) return null;
  return `${prefix} ${formatNewsDate(iso.trim(), "en", "medium")}`;
}

function resolveQualityReport(
  meta: EditorialMetadata
): EditorialQualityReport | null {
  const report = meta.quality_report;
  if (!report || typeof report !== "object") return null;
  return report as EditorialQualityReport;
}

function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function resolveConfidenceEvolution(meta: EditorialMetadata): string | null {
  const report = resolveQualityReport(meta);
  const current = meta.ai_confidence;
  const reported = report?.ai_confidence;

  if (
    typeof current === "number" &&
    typeof reported === "number" &&
    !Number.isNaN(current) &&
    !Number.isNaN(reported) &&
    current !== reported
  ) {
    return `AI confidence evolved (${formatPercent(reported)} → ${formatPercent(current)})`;
  }

  return null;
}

function resolveEventLinkage(
  article: EditorArticleRecord,
  meta: EditorialMetadata,
  generatedRow: GeneratedArticleRow,
  eventViewModel?: EventViewModel | null
): string | null {
  const eventId =
    article.event_id ?? meta.event_id ?? generatedRow.event_id ?? null;
  if (!eventId && !eventViewModel) return null;

  if (eventViewModel?.canonical_title?.trim()) {
    return `Linked to event: ${eventViewModel.canonical_title.trim()}`;
  }
  return "Event linkage present";
}

function resolveCurrentVersionState(
  article: EditorArticleRecord,
  meta: EditorialMetadata
): string | null {
  const segments: string[] = [];
  const workflowStatus = normalizeWorkflowStatus(article.workflow_status);

  if (workflowStatus) {
    segments.push(WORKFLOW_LABELS[workflowStatus]);
  }

  const editorial = article.editorial_status?.trim().toLowerCase() ?? "";
  if (editorial === "approved") {
    segments.push("Approved");
  } else if (editorial === "pending") {
    segments.push("Pending review");
  } else if (editorial === "rejected") {
    segments.push("Rejected");
  }

  if (article.published_at?.trim()) {
    segments.push("Published");
  }

  if (meta.repaired) {
    segments.push("Repaired");
  }

  if (meta.used_fallback) {
    segments.push("Fallback generation");
  }

  const publishDecision = meta.publish_decision?.trim().toLowerCase() ?? "";
  if (publishDecision === "publish") {
    segments.push("Cleared for publication");
  } else if (publishDecision === "repair") {
    segments.push("Repair route");
  } else if (publishDecision === "reject") {
    segments.push("Quality blocked");
  }

  if (!segments.length) return null;
  return [...new Set(segments)].join(" · ");
}

function resolveLatestModification(
  article: EditorArticleRecord,
  meta: EditorialMetadata
): { display: string | null; iso: string | null } {
  const candidates: Array<{ iso: string; label: string }> = [];

  if (meta.regenerated_at?.trim()) {
    candidates.push({ iso: meta.regenerated_at.trim(), label: "Regenerated" });
  }
  if (meta.translations_updated_at?.trim()) {
    candidates.push({
      iso: meta.translations_updated_at.trim(),
      label: "Translations updated",
    });
  }
  if (article.reviewed_at?.trim()) {
    candidates.push({ iso: article.reviewed_at.trim(), label: "Reviewed" });
  }
  if (article.published_at?.trim()) {
    candidates.push({ iso: article.published_at.trim(), label: "Published" });
  }
  if (meta.generated_at?.trim()) {
    candidates.push({ iso: meta.generated_at.trim(), label: "Generated" });
  }
  if (article.created_at?.trim()) {
    candidates.push({ iso: article.created_at.trim(), label: "Created" });
  }

  const latest = candidates
    .filter((entry) => entry.iso)
    .sort(
      (a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime()
    )[0];

  if (!latest) {
    return { display: null, iso: null };
  }

  return {
    display: `${latest.label} · ${formatNewsDate(latest.iso, "en", "medium")}`,
    iso: latest.iso,
  };
}

function buildVersionSummary(
  article: EditorArticleRecord,
  meta: EditorialMetadata,
  generatedRow: GeneratedArticleRow,
  eventViewModel?: EventViewModel | null
): string | null {
  const changeSummary = resolveEditorialChangeHistorySummary(meta);
  const segments: string[] = [];

  if (meta.generated_at?.trim() || article.created_at?.trim()) {
    segments.push("Originally AI-generated");
  }

  if (meta.regenerated_at?.trim()) {
    segments.push("later regenerated");
  }

  if (meta.repaired) {
    segments.push("editorially repaired");
  }

  if (meta.translations_updated_at?.trim()) {
    segments.push("translation metadata updated");
  }

  if (meta.used_fallback) {
    segments.push("produced via fallback path");
  }

  const eventId =
    article.event_id ?? meta.event_id ?? generatedRow.event_id ?? null;
  if (eventId || eventViewModel) {
    segments.push("event-linked");
  }

  if (changeSummary) {
    return changeSummary;
  }

  if (!segments.length) return null;

  const lead = segments[0];
  const rest = segments.slice(1);
  if (!rest.length) return `${lead.charAt(0).toUpperCase()}${lead.slice(1)}.`;
  return `${lead.charAt(0).toUpperCase()}${lead.slice(1)}, ${rest.join(", ")}.`;
}

export function buildVersionIntelligence(
  input: BuildVersionIntelligenceInput
): VersionIntelligenceVm {
  const { article, meta, generatedRow, eventViewModel } = input;
  const latestModification = resolveLatestModification(article, meta);

  const originalIso = meta.generated_at?.trim() || article.created_at?.trim() || null;

  const vm: VersionIntelligenceVm = {
    originalGeneration: formatTimestampLine(originalIso, "Generated on"),
    regenerationDetected: formatTimestampLine(
      meta.regenerated_at,
      "Regenerated on"
    ),
    editorialRepair: meta.repaired ? "Editorial repair recorded" : null,
    translationUpdate: formatTimestampLine(
      meta.translations_updated_at,
      "Translation metadata updated on"
    ),
    confidenceEvolution: resolveConfidenceEvolution(meta),
    eventLinkage: resolveEventLinkage(
      article,
      meta,
      generatedRow,
      eventViewModel
    ),
    currentVersionState: resolveCurrentVersionState(article, meta),
    latestModification: latestModification.display,
    latestModificationIso: latestModification.iso,
    versionSummary: buildVersionSummary(
      article,
      meta,
      generatedRow,
      eventViewModel
    ),
    hasLayer: false,
  };

  vm.hasLayer = Boolean(
    vm.originalGeneration ||
      vm.regenerationDetected ||
      vm.editorialRepair ||
      vm.translationUpdate ||
      vm.confidenceEvolution ||
      vm.eventLinkage ||
      vm.currentVersionState ||
      vm.latestModification ||
      vm.versionSummary
  );

  return vm;
}
