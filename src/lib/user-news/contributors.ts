/**
 * Contributor overview for admins: who is posting, whether their identity check is currently valid, and how their stories fared.
 * Shows the verification RESULT only. No email, phone, identity number or provider reference ever leaves the database through here.
 */
import { effectiveStatus, type VerificationRecord, type VerificationStatus } from "@/lib/user-news/verification";

export type SubmissionStub = { author_id: string; status: string; created_at: string; published_at: string | null };
export type ProfileStub = { user_id: string; display_name: string | null };
export type VerificationStub = { user_id: string; status: VerificationRecord["status"]; provider: string | null; verified_at: string | null; expires_at: string | null };

export type ContributorRow = {
  userId: string;
  displayName: string | null;
  verification: VerificationStatus;
  verificationProvider: string | null;
  submissions: number;
  published: number;
  rejected: number;
  inReview: number;
  lastActivityAt: string;
};

const REVIEW = new Set(["submitted", "under_review", "approved"]);
const REJECTED = new Set(["rejected", "blocked"]);

export function buildContributors(input: { submissions: SubmissionStub[]; profiles: ProfileStub[]; verifications: VerificationStub[]; now?: Date }): ContributorRow[] {
  const now = input.now ?? new Date();
  const names = new Map(input.profiles.map((p) => [p.user_id, p.display_name?.trim() || null]));
  const ver = new Map(input.verifications.map((v) => [v.user_id, v]));
  const byAuthor = new Map<string, ContributorRow>();

  for (const s of input.submissions) {
    let row = byAuthor.get(s.author_id);
    if (!row) {
      const v = ver.get(s.author_id);
      row = {
        userId: s.author_id,
        displayName: names.get(s.author_id) ?? null,
        verification: effectiveStatus(v ? { status: v.status, provider: v.provider, verifiedAt: v.verified_at, expiresAt: v.expires_at } : null, now),
        verificationProvider: v?.provider ?? null,
        submissions: 0,
        published: 0,
        rejected: 0,
        inReview: 0,
        lastActivityAt: s.created_at,
      };
      byAuthor.set(s.author_id, row);
    }
    row.submissions++;
    if (s.status === "published") row.published++;
    else if (REJECTED.has(s.status)) row.rejected++;
    else if (REVIEW.has(s.status)) row.inReview++;
    const at = s.published_at ?? s.created_at;
    if (at > row.lastActivityAt) row.lastActivityAt = at;
  }
  return [...byAuthor.values()].sort((a, b) => b.published - a.published || b.lastActivityAt.localeCompare(a.lastActivityAt));
}
