/**
 * Workflow Intelligence — read-only editorial workflow projection.
 * Pure metadata; no automation, no queries, no network calls.
 */

import type { EventViewModel } from "@/lib/events/event-view-model";
import type { EditorArticleRecord } from "@/lib/editorial-editor/types";
import {
  WORKFLOW_LABELS,
  WORKFLOW_STATUSES,
  type WorkflowStatus,
} from "@/lib/editorial-workflow/types";
import { formatNewsDate } from "@/lib/i18n/format";
import { resolvePublishDecisionLabel } from "@/lib/story/editorial-trust";
import type { EditorialMetadata, GeneratedArticleRow } from "@/lib/types/newsroom";

export type WorkflowIntelligenceVm = {
  currentStage: string | null;
  editorialStatus: string | null;
  publishState: string | null;
  eventLinkedState: string | null;
  aiGenerationState: string | null;
  reviewState: string | null;
  repairState: string | null;
  fallbackState: string | null;
  lastWorkflowTimestamp: string | null;
  lastWorkflowTimestampIso: string | null;
  recommendedNextStep: string | null;
  hasLayer: boolean;
};

export type BuildWorkflowIntelligenceInput = {
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

function formatEditorialStatus(status: string | null | undefined): string | null {
  if (!status?.trim()) return null;
  const normalized = status.trim().toLowerCase();
  if (normalized === "approved") return "Approved";
  if (normalized === "pending") return "Pending";
  if (normalized === "rejected") return "Rejected";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function resolveCurrentStage(
  workflowStatus: WorkflowStatus | null
): string | null {
  if (!workflowStatus) return null;
  return WORKFLOW_LABELS[workflowStatus];
}

function resolvePublishState(
  article: EditorArticleRecord,
  meta: EditorialMetadata,
  workflowStatus: WorkflowStatus | null
): string | null {
  if (article.published_at?.trim()) {
    return "Published";
  }
  if (workflowStatus === "scheduled") {
    return "Scheduled for publication";
  }
  return resolvePublishDecisionLabel(meta.publish_decision);
}

function resolveEventLinkedState(
  article: EditorArticleRecord,
  meta: EditorialMetadata,
  generatedRow: GeneratedArticleRow,
  eventViewModel?: EventViewModel | null
): string | null {
  const eventId =
    article.event_id ?? meta.event_id ?? generatedRow.event_id ?? null;
  if (!eventId && !eventViewModel) return null;

  if (eventViewModel?.is_live) {
    return "Linked to live event coverage";
  }
  if (eventViewModel?.canonical_title?.trim()) {
    return `Linked to event: ${eventViewModel.canonical_title.trim()}`;
  }
  return "Event-backed article";
}

function resolveAiGenerationState(meta: EditorialMetadata): string | null {
  const model = meta.model?.trim();
  if (meta.used_fallback) {
    return model
      ? `AI fallback generation path (${model})`
      : "AI fallback generation path";
  }
  if (model) {
    return `AI-generated draft (${model})`;
  }
  if (meta.generated_at?.trim()) {
    return "AI-generated draft";
  }
  return null;
}

function resolveReviewState(
  article: EditorArticleRecord,
  workflowStatus: WorkflowStatus | null
): string | null {
  const editorial = article.editorial_status?.trim().toLowerCase() ?? "";

  if (editorial === "approved") {
    return "Human reviewed";
  }
  if (editorial === "rejected") {
    return "Editorial rejection recorded";
  }
  if (
    workflowStatus === "review" ||
    workflowStatus === "fact_check" ||
    workflowStatus === "legal_review"
  ) {
    return WORKFLOW_LABELS[workflowStatus];
  }
  if (editorial === "pending") {
    return "Awaiting editorial approval";
  }
  return formatEditorialStatus(article.editorial_status);
}

function resolveRepairState(meta: EditorialMetadata): string | null {
  const publishDecision = meta.publish_decision?.trim().toLowerCase() ?? "";

  if (meta.repaired) {
    return "Editorial repair performed";
  }
  if (publishDecision === "repair") {
    return "Routed to editorial repair";
  }
  return null;
}

function resolveFallbackState(meta: EditorialMetadata): string | null {
  if (!meta.used_fallback) return null;
  return "Fallback generation path used";
}

function resolveLastWorkflowTimestamp(
  article: EditorArticleRecord,
  meta: EditorialMetadata
): { display: string | null; iso: string | null } {
  const candidates: Array<{ iso: string; label: string }> = [];

  if (article.published_at?.trim()) {
    candidates.push({ iso: article.published_at.trim(), label: "Published" });
  }
  if (article.reviewed_at?.trim()) {
    candidates.push({ iso: article.reviewed_at.trim(), label: "Reviewed" });
  }
  if (meta.regenerated_at?.trim()) {
    candidates.push({ iso: meta.regenerated_at.trim(), label: "Regenerated" });
  }
  if (meta.translations_updated_at?.trim()) {
    candidates.push({
      iso: meta.translations_updated_at.trim(),
      label: "Translations updated",
    });
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

function isPublishedArticle(
  article: EditorArticleRecord,
  workflowStatus: WorkflowStatus | null
): boolean {
  return (
    Boolean(article.published_at?.trim()) || workflowStatus === "published"
  );
}

function hasActiveEventCoverage(
  article: EditorArticleRecord,
  meta: EditorialMetadata,
  generatedRow: GeneratedArticleRow,
  eventViewModel?: EventViewModel | null
): boolean {
  const eventId =
    article.event_id ?? meta.event_id ?? generatedRow.event_id ?? null;
  if (!eventId && !eventViewModel) return false;

  if (eventViewModel?.is_live) return true;

  const stats = eventViewModel?.coverage_statistics;
  return Boolean(
    stats &&
      (stats.update_count > 0 ||
        stats.last_update_at ||
        eventViewModel.latest_update)
  );
}

export function resolveWorkflowRecommendedNextStep(input: {
  article: EditorArticleRecord;
  meta: EditorialMetadata;
  generatedRow: GeneratedArticleRow;
  eventViewModel?: EventViewModel | null;
}): string | null {
  const { article, meta, generatedRow, eventViewModel } = input;
  const workflowStatus = normalizeWorkflowStatus(article.workflow_status);
  const editorialStatus = article.editorial_status?.trim().toLowerCase() ?? "";
  const publishDecision = meta.publish_decision?.trim().toLowerCase() ?? "";
  const published = isPublishedArticle(article, workflowStatus);

  if (published && hasActiveEventCoverage(article, meta, generatedRow, eventViewModel)) {
    return "Monitor ongoing event";
  }

  if (published) {
    return "Already published";
  }

  if (publishDecision === "reject") {
    return null;
  }

  if (
    workflowStatus === "scheduled" &&
    publishDecision === "publish" &&
    editorialStatus === "approved"
  ) {
    return "Ready for publication";
  }

  if (publishDecision === "publish" && editorialStatus === "approved") {
    return "Ready for publication";
  }

  if (
    workflowStatus === "review" ||
    workflowStatus === "fact_check" ||
    workflowStatus === "legal_review"
  ) {
    return "Review before publishing";
  }

  if (publishDecision === "publish" && editorialStatus !== "approved") {
    return "Review before publishing";
  }

  if (publishDecision === "repair" || meta.repaired) {
    return "Review before publishing";
  }

  if (editorialStatus === "pending" || workflowStatus === "draft") {
    return "Await editorial approval";
  }

  if (workflowStatus === "scheduled") {
    return "Ready for publication";
  }

  return null;
}

export function buildWorkflowIntelligence(
  input: BuildWorkflowIntelligenceInput
): WorkflowIntelligenceVm {
  const { article, meta, generatedRow, eventViewModel } = input;
  const workflowStatus = normalizeWorkflowStatus(article.workflow_status);
  const lastTimestamp = resolveLastWorkflowTimestamp(article, meta);

  const vm: WorkflowIntelligenceVm = {
    currentStage: resolveCurrentStage(workflowStatus),
    editorialStatus: formatEditorialStatus(article.editorial_status),
    publishState: resolvePublishState(article, meta, workflowStatus),
    eventLinkedState: resolveEventLinkedState(
      article,
      meta,
      generatedRow,
      eventViewModel
    ),
    aiGenerationState: resolveAiGenerationState(meta),
    reviewState: resolveReviewState(article, workflowStatus),
    repairState: resolveRepairState(meta),
    fallbackState: resolveFallbackState(meta),
    lastWorkflowTimestamp: lastTimestamp.display,
    lastWorkflowTimestampIso: lastTimestamp.iso,
    recommendedNextStep: resolveWorkflowRecommendedNextStep({
      article,
      meta,
      generatedRow,
      eventViewModel,
    }),
    hasLayer: false,
  };

  vm.hasLayer = Boolean(
    vm.currentStage ||
      vm.editorialStatus ||
      vm.publishState ||
      vm.eventLinkedState ||
      vm.aiGenerationState ||
      vm.reviewState ||
      vm.repairState ||
      vm.fallbackState ||
      vm.lastWorkflowTimestamp ||
      vm.recommendedNextStep
  );

  return vm;
}
