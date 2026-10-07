/**
 * Shared types and the PORTS (interfaces) of the user-news service.
 *
 * service.ts holds all the policy (gates, transitions, rate limits, publishing) and depends only on these interfaces, so every flow can be
 * tested with in-memory fakes. supabase-repo.ts is the thin adapter that talks to Postgres / Storage.
 */

import type { SubmissionStatus } from "@/lib/user-news/status-machine";
import type { VerificationRecord, VerificationStatus } from "@/lib/user-news/verification";
import type { FactFlag } from "@/lib/user-news/fact-check";
import type { RiskFlag } from "@/lib/user-news/risk-flags";
import type { SubmissionGeo } from "@/lib/user-news/submission-geo";
import type { ChatFn } from "@/lib/user-news/ai-draft";
import type { MediaKind } from "@/lib/user-news/media-validate";

export type UserNewsLanguage = "hi" | "en";
export type InputKind = "text" | "voice" | "text_and_voice";

export type SubmissionRow = {
  id: string;
  author_id: string;
  status: SubmissionStatus;
  language: UserNewsLanguage;
  input_kind: InputKind;
  raw_text: string | null;
  transcript: string | null;
  headline: string | null;
  subheadline: string | null;
  summary: string | null;
  body: string | null;
  location_text: string | null;
  declared_district: string | null;
  moderator_confirmed_district: string | null;
  geo: Partial<SubmissionGeo> & Record<string, unknown>;
  category: string | null;
  tags: string[];
  fact_flags: FactFlag[];
  risk_flags: RiskFlag[];
  ai_meta: Record<string, unknown>;
  also_publish_language: UserNewsLanguage | null;
  version: number;
  user_approved_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  published_at: string | null;
  published_article_id: string | null;
  created_at: string;
  updated_at: string;
};

export type RevisionKind = "source" | "transcript" | "ai_draft" | "user_edit" | "moderator_edit" | "translation";
export type RevisionRow = { id: string; submission_id: string; version: number; kind: RevisionKind; actor_id: string | null; snapshot: Record<string, unknown>; created_at: string };

export type ModerationDecision = "approve" | "reject" | "request_edit" | "hold" | "block" | "unpublish" | "confirm_district";
export type ModerationRow = { id: string; submission_id: string; moderator_id: string; decision: ModerationDecision; reason_code: string | null; reason_text: string | null; flags: unknown[]; created_at: string };

export type MediaRow = {
  id: string;
  submission_id: string;
  owner_id: string;
  kind: MediaKind | "voice";
  storage_path: string;
  optimized_path: string | null;
  thumbnail_path: string | null;
  original_mime: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  checksum_sha256: string | null;
  processing_status: "pending" | "processing" | "ready" | "failed" | "rejected";
  validation: Record<string, unknown>;
  created_at: string;
};

export type AuditEvent = {
  actor_id: string | null;
  actor_kind: "user" | "moderator" | "admin" | "provider" | "system";
  action: string;
  entity_type: string;
  entity_id: string;
  detail?: Record<string, unknown>;
};

export type VerificationEventInput = {
  user_id: string;
  from_status: VerificationStatus | null;
  to_status: VerificationStatus;
  actor_kind: "provider" | "admin" | "system";
  actor_id: string | null;
  provider: string | null;
  reference: string | null;
  detail?: Record<string, unknown>;
};

export type GeneratedArticleInsert = {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  article_body: string;
  hero_image_url: string | null;
  seo_title: string;
  seo_description: string | null;
  reading_time: string;
  language: UserNewsLanguage;
  tags: string[];
  published_at: string;
  editorial_status: "approved";
  workflow_status: "published";
  reviewed_at: string;
  geo_metadata: Record<string, unknown>;
  editorial_metadata: Record<string, unknown>;
  /** Pipeline tenant; set by the adapter, like every editorially generated article. */
  tenant_id?: string | null;
};

export interface Repo {
  getVerification(userId: string): Promise<VerificationRecord | null>;
  upsertVerification(input: { userId: string; status: VerificationStatus; provider: string | null; reference: string | null; verifiedAt: string | null; expiresAt: string | null; consentVersion: string | null }): Promise<void>;
  insertVerificationEvent(e: VerificationEventInput): Promise<void>;

  insertSubmission(row: Pick<SubmissionRow, "author_id" | "language" | "input_kind" | "raw_text" | "transcript" | "location_text" | "declared_district">): Promise<SubmissionRow>;
  getSubmission(id: string): Promise<SubmissionRow | null>;
  /** Applies `patch` only if the row is still in `expectedStatus` (optimistic concurrency). Returns null if it lost the race. */
  updateSubmission(id: string, patch: Partial<SubmissionRow>, expectedStatus: SubmissionStatus): Promise<SubmissionRow | null>;
  listSubmissionsByAuthor(authorId: string): Promise<SubmissionRow[]>;
  listForModeration(statuses: SubmissionStatus[], limit: number): Promise<SubmissionRow[]>;

  insertRevision(r: Omit<RevisionRow, "id" | "created_at">): Promise<void>;
  listRevisions(submissionId: string): Promise<RevisionRow[]>;
  insertModeration(m: Omit<ModerationRow, "id" | "created_at">): Promise<void>;
  listModeration(submissionId: string): Promise<ModerationRow[]>;

  insertMedia(m: Omit<MediaRow, "id" | "created_at" | "optimized_path" | "thumbnail_path" | "width" | "height" | "duration_ms" | "checksum_sha256" | "validation" | "processing_status">): Promise<MediaRow>;
  getMedia(id: string): Promise<MediaRow | null>;
  updateMedia(id: string, patch: Partial<MediaRow>): Promise<void>;
  listMedia(submissionId: string): Promise<MediaRow[]>;

  countAiDraftsSince(authorId: string, sinceIso: string): Promise<number>;
  countSubmissionsSince(authorId: string, sinceIso: string): Promise<number>;
  recentPublishedHeadlines(limit: number): Promise<string[]>;
  audit(e: AuditEvent): Promise<void>;
  publishArticle(row: GeneratedArticleInsert): Promise<void>;
  /** Takes a published article out of every public feed (editorial_status -> rejected, workflow_status -> archived: generated_articles has no 'archived' editorial status). Reversible: nothing is deleted. */
  unpublishArticle(articleId: string): Promise<void>;
  getAuthorDisplayName(userId: string): Promise<string | null>;
  myStats(authorId: string): Promise<Array<Record<string, unknown>>>;
}

export interface MediaStorage {
  createSignedUpload(path: string): Promise<{ path: string; token: string; signedUrl: string }>;
  /** Whole object, or a byte range: `start` (default 0) for up to `maxBytes`. Used to read a video's head and tail without loading it all. */
  download(path: string, opts?: { start?: number; maxBytes?: number }): Promise<Uint8Array>;
  /** Byte size of the stored object, from storage metadata (never from the client). */
  statSize(path: string): Promise<number | null>;
  uploadPrivate(path: string, bytes: Uint8Array, mime: string): Promise<void>;
  /** Writes into the PUBLIC bucket and returns its public URL. Only re-encoded derivatives ever go here. */
  uploadPublic(path: string, bytes: Uint8Array, mime: string): Promise<string>;
  signedReadUrl(path: string, ttlSeconds: number): Promise<string>;
}

export type SttResult = { ok: true; transcript: string; confidence: number | null; durationMs: number | null } | { ok: false; error: "unconfigured" | "unsupported_audio" | "provider_error" | "no_speech"; message: string };
export type SttFn = (input: { bytes: Uint8Array; mime: string; language: UserNewsLanguage }) => Promise<SttResult>;

export type Deps = {
  repo: Repo;
  storage: MediaStorage;
  chat: ChatFn;
  stt: SttFn;
  now: () => Date;
  env: Record<string, string | undefined>;
  /** Called after an article is published so the feeds refresh (debounced by the implementation). */
  revalidateFeeds: () => void;
};

export type Fail = { ok: false; status: number; code: string; message: string; details?: Record<string, unknown> };
export type Ok<T> = { ok: true } & T;
export type Result<T> = Ok<T> | Fail;

export const fail = (status: number, code: string, message: string, details?: Record<string, unknown>): Fail => ({ ok: false, status, code, message, details });
