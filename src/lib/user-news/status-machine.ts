/**
 * User-news submission state machine.
 *
 *   draft -> ai_generated -> user_approved -> submitted -> under_review -> approved -> published
 *                                                              |-> rejected | blocked | (request edit: back to ai_generated)
 *   withdrawn: the author may withdraw at any point before moderation completes, and may withdraw a published story.
 *
 * Invariants the machine enforces (each is tested):
 *   - Only the AUTHOR can move a story to user_approved: the platform never approves on a user's behalf.
 *   - Only a MODERATOR decides approved / rejected / blocked. An author can never approve, publish or un-reject their own story.
 *   - A story becomes published only from approved. There is no path from draft / ai_generated / submitted to published.
 *   - rejected and blocked are terminal.
 * Pure: no I/O. The server API applies it after re-reading the row, so a client can never pick its own transition.
 */

export const SUBMISSION_STATUSES = [
  "draft",
  "ai_generated",
  "user_approved",
  "submitted",
  "under_review",
  "approved",
  "published",
  "rejected",
  "blocked",
  "withdrawn",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export type Actor = "author" | "moderator" | "system";

const T: Record<SubmissionStatus, Partial<Record<Actor, readonly SubmissionStatus[]>>> = {
  draft: {
    author: ["draft", "withdrawn"],
    system: ["ai_generated"],
  },
  ai_generated: {
    author: ["ai_generated", "user_approved", "withdrawn"],
    system: ["ai_generated"],
  },
  user_approved: {
    // the author may go back to edit before submitting, or submit
    author: ["ai_generated", "submitted", "withdrawn"],
  },
  submitted: {
    author: ["withdrawn"],
    system: ["under_review"],
    moderator: ["under_review"],
  },
  under_review: {
    author: ["withdrawn"],
    // "hold" keeps it under_review; "request edit" returns it to the author as ai_generated
    moderator: ["under_review", "approved", "rejected", "blocked", "ai_generated"],
  },
  approved: {
    author: ["withdrawn"],
    moderator: ["published", "rejected", "blocked"],
    system: ["published"],
  },
  published: {
    // takedown by a moderator, or the author withdrawing their own story
    author: ["withdrawn"],
    moderator: ["blocked", "withdrawn"],
  },
  rejected: {},
  blocked: {},
  withdrawn: {},
};

export function allowedTransitions(from: SubmissionStatus, actor: Actor): readonly SubmissionStatus[] {
  return T[from]?.[actor] ?? [];
}

export function canTransition(from: SubmissionStatus, to: SubmissionStatus, actor: Actor): boolean {
  return allowedTransitions(from, actor).includes(to);
}

export class InvalidTransitionError extends Error {
  readonly code = "invalid_transition";
  constructor(readonly from: SubmissionStatus, readonly to: SubmissionStatus, readonly actor: Actor) {
    super(`${actor} cannot move a submission from ${from} to ${to}`);
  }
}

export function assertTransition(from: SubmissionStatus, to: SubmissionStatus, actor: Actor): void {
  if (!canTransition(from, to, actor)) throw new InvalidTransitionError(from, to, actor);
}

export const TERMINAL_STATUSES: ReadonlySet<SubmissionStatus> = new Set(["rejected", "blocked", "withdrawn"]);

/** The author may edit the text only while the story has not been handed to moderation. */
export function isAuthorEditable(status: SubmissionStatus): boolean {
  return status === "draft" || status === "ai_generated" || status === "user_approved";
}

/** Statuses visible to readers (the story exists as a public article). */
export function isPubliclyVisibleStatus(status: SubmissionStatus): boolean {
  return status === "published";
}

export function isSubmissionStatus(v: unknown): v is SubmissionStatus {
  return typeof v === "string" && (SUBMISSION_STATUSES as readonly string[]).includes(v);
}

/** "My News" filter groups. */
export type MyNewsFilter = "all" | "published" | "pending" | "rejected" | "draft";

export function statusMatchesFilter(status: SubmissionStatus, filter: MyNewsFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "published":
      return status === "published";
    case "pending":
      return status === "user_approved" || status === "submitted" || status === "under_review" || status === "approved";
    case "rejected":
      return status === "rejected" || status === "blocked";
    case "draft":
      return status === "draft" || status === "ai_generated";
  }
}

/** Human labels (English + Hindi) for the author-facing status chip. */
export const STATUS_LABELS: Record<SubmissionStatus, { en: string; hi: string }> = {
  draft: { en: "Draft", hi: "ड्राफ्ट" },
  ai_generated: { en: "AI draft ready", hi: "AI ड्राफ्ट तैयार" },
  user_approved: { en: "Approved by you", hi: "आपने स्वीकृत किया" },
  submitted: { en: "Submitted", hi: "जमा किया गया" },
  under_review: { en: "Under moderation", hi: "समीक्षा में" },
  approved: { en: "Approved — publishing", hi: "स्वीकृत — प्रकाशन में" },
  published: { en: "Published", hi: "प्रकाशित" },
  rejected: { en: "Rejected", hi: "अस्वीकृत" },
  blocked: { en: "Blocked", hi: "ब्लॉक किया गया" },
  withdrawn: { en: "Withdrawn", hi: "वापस लिया गया" },
};
