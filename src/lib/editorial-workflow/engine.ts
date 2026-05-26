import { normalizeDashboardRole, type CanonicalRole } from "@/lib/saas-auth/roles";
import {
  WORKFLOW_SLA_HOURS,
  WORKFLOW_STATUSES,
  type WorkflowStatus,
} from "@/lib/editorial-workflow/types";

/** Allowed transitions: from -> to[] */
const TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  draft: ["review", "archived"],
  review: ["fact_check", "draft", "archived"],
  fact_check: ["legal_review", "review", "archived"],
  legal_review: ["scheduled", "fact_check", "archived"],
  scheduled: ["published", "legal_review", "archived"],
  published: ["archived"],
  archived: ["draft"],
};

const ROLE_TRANSITIONS: Record<CanonicalRole, [WorkflowStatus, WorkflowStatus][]> = {
  super_admin: [],
  journalist: [
    ["draft", "review"],
  ],
  editor: [
    ["draft", "review"],
    ["review", "fact_check"],
    ["review", "draft"],
    ["fact_check", "legal_review"],
    ["fact_check", "review"],
    ["legal_review", "fact_check"],
  ],
  moderator: [
    ["draft", "review"],
    ["review", "fact_check"],
    ["review", "draft"],
    ["fact_check", "legal_review"],
    ["fact_check", "review"],
    ["legal_review", "scheduled"],
    ["legal_review", "fact_check"],
    ["scheduled", "published"],
    ["scheduled", "legal_review"],
    ["published", "archived"],
  ],
};

function roleCanTransition(
  role: CanonicalRole,
  from: WorkflowStatus,
  to: WorkflowStatus
): boolean {
  if (role === "super_admin") return true;
  const pairs = ROLE_TRANSITIONS[role] ?? [];
  return pairs.some(([f, t]) => f === from && t === to);
}

export function canPublishDirectly(role: string): boolean {
  const r = normalizeDashboardRole(role);
  return r === "super_admin" || r === "moderator";
}

export function canApproveWorkflow(role: string): boolean {
  const r = normalizeDashboardRole(role);
  return r === "super_admin" || r === "editor" || r === "moderator";
}

export function validateTransition(input: {
  role: string;
  from: WorkflowStatus;
  to: WorkflowStatus;
}): { ok: true } | { ok: false; error: string } {
  const from = input.from;
  const to = input.to;

  if (!WORKFLOW_STATUSES.includes(from) || !WORKFLOW_STATUSES.includes(to)) {
    return { ok: false, error: "invalid_status" };
  }

  if (from === to) {
    return { ok: false, error: "same_status" };
  }

  const allowed = TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    return { ok: false, error: "transition_not_allowed" };
  }

  const role = normalizeDashboardRole(input.role);

  if (to === "published" && !canPublishDirectly(role)) {
    return { ok: false, error: "publish_requires_moderator_or_admin" };
  }

  if (!roleCanTransition(role, from, to)) {
    return { ok: false, error: "role_cannot_transition" };
  }

  return { ok: true };
}

export function deadlineForStatus(status: WorkflowStatus): string | null {
  const hours = WORKFLOW_SLA_HOURS[status];
  if (!hours) return null;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function syncLegacyEditorialStatus(
  workflowStatus: WorkflowStatus,
  publishedAt: string | null
): "pending" | "approved" | "rejected" {
  if (workflowStatus === "published") return "approved";
  if (workflowStatus === "archived") return "rejected";
  return "pending";
}

export function nextStatusesForRole(
  role: string,
  current: WorkflowStatus
): WorkflowStatus[] {
  const candidates = TRANSITIONS[current] ?? [];
  return candidates.filter((to) => validateTransition({ role, from: current, to }).ok);
}
