export const WORKFLOW_STATUSES = [
  "draft",
  "review",
  "fact_check",
  "legal_review",
  "scheduled",
  "published",
  "archived",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  draft: "Draft",
  review: "Review",
  fact_check: "Fact check",
  legal_review: "Legal review",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

export const WORKFLOW_SLA_HOURS: Partial<Record<WorkflowStatus, number>> = {
  review: 4,
  fact_check: 6,
  legal_review: 8,
  scheduled: 24,
};

export type WorkflowArticleCard = {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  workflow_status: WorkflowStatus;
  workflow_deadline_at: string | null;
  workflow_assigned_to: string | null;
  workflow_rejection_reason: string | null;
  editorial_status: string;
  published_at: string | null;
  created_at: string;
  language: string | null;
  assignee_email: string | null;
  is_overdue: boolean;
};

export type WorkflowEventRecord = {
  id: string;
  article_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  comment: string | null;
  rejection_reason: string | null;
  actor_email: string | null;
  created_at: string;
  payload: Record<string, unknown>;
};

export type WorkflowCommentRecord = {
  id: string;
  article_id: string;
  author_email: string;
  body: string;
  workflow_status: string | null;
  created_at: string;
};

export type WorkflowBoardSnapshot = {
  columns: Record<WorkflowStatus, WorkflowArticleCard[]>;
  analytics: {
    total: number;
    pending_review: number;
    overdue: number;
    published_today: number;
    by_status: Record<WorkflowStatus, number>;
    workload: { email: string; count: number }[];
  };
  events: WorkflowEventRecord[];
  fetchedAt: string;
};
