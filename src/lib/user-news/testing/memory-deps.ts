/**
 * In-memory implementations of the user-news ports, for tests. They deliberately re-implement the DATABASE's invariants
 * (valid status transitions, "no moderation without a recorded approval", immutable author, append-only history) so a bug in the
 * service surfaces here exactly as it would against Postgres.
 */

import { randomUUID } from "node:crypto";
import { SUBMISSION_STATUSES, allowedTransitions, type Actor, type SubmissionStatus } from "@/lib/user-news/status-machine";
import type { VerificationRecord } from "@/lib/user-news/verification";
import type {
  AuditEvent,
  Deps,
  GeneratedArticleInsert,
  MediaRow,
  MediaStorage,
  ModerationRow,
  Repo,
  RevisionRow,
  SttFn,
  SubmissionRow,
  VerificationEventInput,
} from "@/lib/user-news/types";
import type { ChatFn } from "@/lib/user-news/ai-draft";

const ACTORS: Actor[] = ["author", "moderator", "system"];
function unionAllowed(from: SubmissionStatus, to: SubmissionStatus): boolean {
  return ACTORS.some((a) => allowedTransitions(from, a).includes(to));
}

export class MemoryRepo implements Repo {
  verification = new Map<string, VerificationRecord & { consentVersion?: string | null }>();
  verificationEvents: VerificationEventInput[] = [];
  submissions = new Map<string, SubmissionRow>();
  revisions: RevisionRow[] = [];
  moderation: ModerationRow[] = [];
  media = new Map<string, MediaRow>();
  audits: AuditEvent[] = [];
  articles = new Map<string, GeneratedArticleInsert & { archived?: boolean }>();
  headlines: string[] = [];
  names = new Map<string, string>();
  stats: Array<Record<string, unknown>> = [];
  clock = () => new Date();

  async getVerification(userId: string) {
    return this.verification.get(userId) ?? null;
  }
  async upsertVerification(i: { userId: string; status: VerificationRecord["status"]; provider: string | null; reference: string | null; verifiedAt: string | null; expiresAt: string | null; consentVersion: string | null }) {
    this.verification.set(i.userId, { status: i.status, provider: i.provider, verifiedAt: i.verifiedAt, expiresAt: i.expiresAt, consentVersion: i.consentVersion });
  }
  async insertVerificationEvent(e: VerificationEventInput) {
    this.verificationEvents.push(e);
  }

  async insertSubmission(row: Pick<SubmissionRow, "author_id" | "language" | "input_kind" | "raw_text" | "transcript" | "location_text" | "declared_district">) {
    const now = this.clock().toISOString();
    const full: SubmissionRow = {
      id: randomUUID(),
      status: "draft",
      subheadline: null,
      headline: null,
      summary: null,
      body: null,
      moderator_confirmed_district: null,
      geo: {},
      category: null,
      tags: [],
      fact_flags: [],
      risk_flags: [],
      ai_meta: {},
      also_publish_language: null,
      version: 1,
      user_approved_at: null,
      submitted_at: null,
      reviewed_at: null,
      reviewer_id: null,
      published_at: null,
      published_article_id: null,
      created_at: now,
      updated_at: now,
      ...row,
    };
    this.submissions.set(full.id, full);
    return { ...full };
  }
  async getSubmission(id: string) {
    const r = this.submissions.get(id);
    return r ? { ...r } : null;
  }
  async updateSubmission(id: string, patch: Partial<SubmissionRow>, expectedStatus: SubmissionStatus) {
    const cur = this.submissions.get(id);
    if (!cur || cur.status !== expectedStatus) return null; // lost the race
    const next: SubmissionRow = { ...cur, ...patch, updated_at: this.clock().toISOString() };
    // ---- the database's own rules ----
    if (patch.author_id && patch.author_id !== cur.author_id) throw new Error("author_id is immutable");
    if (next.status !== cur.status) {
      if (!SUBMISSION_STATUSES.includes(next.status)) throw new Error("unknown status");
      if (!unionAllowed(cur.status, next.status)) throw new Error(`invalid status transition ${cur.status} -> ${next.status}`);
      if (next.status === "ai_generated" && (cur.status === "under_review" || cur.status === "user_approved")) {
        next.user_approved_at = null;
        next.submitted_at = null;
      }
    }
    if (["submitted", "under_review", "approved", "published"].includes(next.status) && !next.user_approved_at) throw new Error("user_news_requires_user_approval");
    if (next.status === "published" && !next.published_article_id) throw new Error("user_news_published_has_article");
    this.submissions.set(id, next);
    return { ...next };
  }
  async listSubmissionsByAuthor(authorId: string) {
    return [...this.submissions.values()].filter((s) => s.author_id === authorId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async listForModeration(statuses: SubmissionStatus[], limit: number) {
    return [...this.submissions.values()].filter((s) => statuses.includes(s.status)).slice(0, limit);
  }

  async insertRevision(r: Omit<RevisionRow, "id" | "created_at">) {
    if (this.revisions.some((x) => x.submission_id === r.submission_id && x.version === r.version && x.kind === r.kind)) throw new Error("duplicate revision");
    this.revisions.push({ ...r, id: randomUUID(), created_at: this.clock().toISOString() });
  }
  async listRevisions(submissionId: string) {
    return this.revisions.filter((r) => r.submission_id === submissionId);
  }
  async insertModeration(m: Omit<ModerationRow, "id" | "created_at">) {
    if (["reject", "block", "request_edit", "unpublish"].includes(m.decision) && (m.reason_text ?? "").trim().length < 5) throw new Error("a rejection needs a written reason");
    this.moderation.push({ ...m, id: randomUUID(), created_at: this.clock().toISOString() });
  }
  async listModeration(submissionId: string) {
    return this.moderation.filter((m) => m.submission_id === submissionId);
  }

  async insertMedia(m: Parameters<Repo["insertMedia"]>[0]) {
    const row: MediaRow = { ...m, id: randomUUID(), created_at: this.clock().toISOString(), optimized_path: null, thumbnail_path: null, width: null, height: null, duration_ms: null, checksum_sha256: null, validation: {}, processing_status: "pending" };
    this.media.set(row.id, row);
    return { ...row };
  }
  async getMedia(id: string) {
    const m = this.media.get(id);
    return m ? { ...m } : null;
  }
  async updateMedia(id: string, patch: Partial<MediaRow>) {
    const m = this.media.get(id);
    if (m) this.media.set(id, { ...m, ...patch });
  }
  async listMedia(submissionId: string) {
    return [...this.media.values()].filter((m) => m.submission_id === submissionId);
  }

  async countAiDraftsSince(authorId: string, sinceIso: string) {
    return this.audits.filter((a) => a.action === "user_news.ai_draft" && a.actor_id === authorId && (a.detail?.at as string | undefined ? (a.detail!.at as string) >= sinceIso : true)).length;
  }
  async countSubmissionsSince(authorId: string, sinceIso: string) {
    return [...this.submissions.values()].filter((s) => s.author_id === authorId && s.created_at >= sinceIso).length;
  }
  async recentPublishedHeadlines() {
    return this.headlines;
  }
  async audit(e: AuditEvent) {
    this.audits.push(e);
  }
  async publishArticle(row: GeneratedArticleInsert) {
    this.articles.set(row.id, row); // upsert by id: idempotent
  }
  async unpublishArticle(articleId: string) {
    const a = this.articles.get(articleId);
    // mirrors the adapter: editorial_status has no "archived" value, so a takedown is rejected + workflow archived
    if (a) this.articles.set(articleId, { ...a, archived: true });
  }
  async getAuthorDisplayName(userId: string) {
    return this.names.get(userId) ?? null;
  }
  async myStats() {
    return this.stats;
  }
}

export class MemoryStorage implements MediaStorage {
  private: Map<string, { bytes: Uint8Array; mime: string }> = new Map();
  public: Map<string, { bytes: Uint8Array; mime: string }> = new Map();
  signedUploads: string[] = [];
  declaredSizes = new Map<string, number>();

  /** Simulates the client finishing its direct upload to the signed URL. */
  put(path: string, bytes: Uint8Array, mime = "application/octet-stream") {
    this.private.set(path, { bytes, mime });
  }
  async createSignedUpload(path: string) {
    this.signedUploads.push(path);
    return { path, token: `tok_${path}`, signedUrl: `https://storage.test/upload/${path}` };
  }
  async download(path: string, opts?: { start?: number; maxBytes?: number }) {
    const f = this.private.get(path);
    if (!f) throw new Error(`no such object ${path}`);
    const start = opts?.start ?? 0;
    return f.bytes.slice(start, opts?.maxBytes ? start + opts.maxBytes : undefined);
  }
  async statSize(path: string) {
    return this.private.get(path)?.bytes.length ?? null;
  }
  async uploadPrivate(path: string, bytes: Uint8Array, mime: string) {
    this.private.set(path, { bytes, mime });
  }
  async uploadPublic(path: string, bytes: Uint8Array, mime: string) {
    this.public.set(path, { bytes, mime });
    return `https://cdn.test/${path}`;
  }
  async signedReadUrl(path: string) {
    return `https://storage.test/read/${path}?sig=1`;
  }
}

export function makeDeps(overrides: Partial<Deps> & { repo?: MemoryRepo; storage?: MemoryStorage } = {}) {
  const repo = overrides.repo ?? new MemoryRepo();
  const storage = overrides.storage ?? new MemoryStorage();
  const revalidate = { calls: 0 };
  const chat: ChatFn = overrides.chat ?? (async () => ({ ok: false as const, error: {} as never, provider: "groq" as never, latencyMs: 1 }));
  const stt: SttFn = overrides.stt ?? (async () => ({ ok: false as const, error: "unconfigured" as const, message: "Speech-to-text is not configured." }));
  const deps: Deps = {
    repo,
    storage,
    chat,
    stt,
    now: overrides.now ?? (() => new Date("2026-10-07T12:00:00.000Z")),
    env: overrides.env ?? { IDENTITY_MANUAL_ATTESTATION_ENABLED: "true" },
    revalidateFeeds: overrides.revalidateFeeds ?? (() => void (revalidate.calls += 1)),
  };
  return { deps, repo, storage, revalidate };
}

export function verify(repo: MemoryRepo, userId: string, extra: Partial<VerificationRecord> = {}) {
  repo.verification.set(userId, { status: "verified", provider: "manual_admin", verifiedAt: "2026-09-01T00:00:00.000Z", expiresAt: null, ...extra });
}
