import type { OwnSubmissionView } from "@/lib/user-news/service";
import { flagLabel, type UserNewsLocale } from "@/features/user-news/strings";

export type WizardStep = 1 | 2 | 3 | 4 | 5;
export const MIN_SOURCE_CHARS = 40;

/** Which step to resume a saved story at. */
export function stepForStatus(status: string, hasAiDraft: boolean): WizardStep {
  switch (status) {
    case "draft":
      return hasAiDraft ? 4 : 1;
    case "ai_generated":
      return 4;
    case "user_approved":
      return 5;
    default:
      return 5; // submitted / under review / decided: nothing left to edit
  }
}

/** Can the author leave step 1? Typed text of a sensible length, or a recording that will be transcribed. */
export function canContinueStep1(input: { text: string; hasVoice: boolean; transcript: string }): { ok: boolean; reason: "empty" | "too_short" | null } {
  const chars = (input.text.trim() + input.transcript.trim()).length;
  if (chars >= MIN_SOURCE_CHARS) return { ok: true, reason: null };
  if (input.hasVoice && chars === 0) return { ok: true, reason: null }; // the transcript will supply the text
  return { ok: false, reason: chars === 0 ? "empty" : "too_short" };
}

export type FlagSummary = {
  blockingFacts: string[];
  blockingRisk: string[];
  reviewRisk: string[];
  warnings: string[];
};

type AnyFlag = { code: string; severity: "block" | "review" | "info" | "warn"; value?: string; evidence?: string };

/** Groups flags for the author in plain language. Blocking items must be fixed; review items are for the moderator; warnings are advice. */
export function summarizeFlags(view: Pick<OwnSubmissionView["submission"], "fact_flags" | "risk_flags">, locale: UserNewsLocale): FlagSummary {
  const out: FlagSummary = { blockingFacts: [], blockingRisk: [], reviewRisk: [], warnings: [] };
  for (const f of (view.fact_flags ?? []) as AnyFlag[]) {
    const line = `${flagLabel(f.code, locale)}${f.value ? `: ${f.value}` : ""}`;
    (f.severity === "block" ? out.blockingFacts : out.warnings).push(line);
  }
  for (const f of (view.risk_flags ?? []) as AnyFlag[]) {
    const line = flagLabel(f.code, locale);
    if (f.severity === "block") out.blockingRisk.push(line);
    else if (f.severity === "review") out.reviewRisk.push(line);
  }
  return out;
}

export type GeoNote = { kind: "found" | "unknown" | "unverified_district"; text?: string };

export function geoNote(geo: Record<string, unknown> | undefined): GeoNote {
  const scope = (geo?.scope as string | undefined) ?? "UNKNOWN";
  const declaredStatus = geo?.declaredDistrictStatus as string | undefined;
  if (scope === "UNKNOWN") return { kind: "unknown" };
  if (declaredStatus === "unverified" || declaredStatus === "conflicts_with_text") return { kind: "unverified_district" };
  return { kind: "found", text: ((geo?.districtSlug as string | null) ?? undefined) || undefined };
}

export function canApprove(view: Pick<OwnSubmissionView, "readiness" | "submission">, dirty: boolean): boolean {
  return view.submission.status === "ai_generated" && view.readiness.ready && !dirty;
}

export function canSubmit(view: Pick<OwnSubmissionView, "submission" | "media">): { ok: boolean; reason: "not_approved" | "media_problem" | null } {
  if (view.submission.status !== "user_approved") return { ok: false, reason: "not_approved" };
  if (view.media.some((m) => m.status === "rejected" || m.status === "failed")) return { ok: false, reason: "media_problem" };
  return { ok: true, reason: null };
}

export function mediaStatusLabel(status: string): "ready" | "pendingCheck" | "rejected" | "checking" {
  if (status === "ready") return "ready";
  if (status === "rejected" || status === "failed") return "rejected";
  if (status === "pending") return "pendingCheck";
  return "checking";
}
