/**
 * Supabase implementations of the user-news ports (service_role, server only).
 *
 * Thin on purpose: all policy lives in service.ts. Writes use the admin client, so the database's own triggers and CHECK constraints
 * (migration 100) are the last line of defence if the service ever had a bug.
 * Statuses are written with optimistic concurrency (`where status = expected`), so two concurrent requests cannot both transition a story.
 */

import { createAdminServerClient } from "@/lib/supabase/admin";
import { getPipelineTenantId } from "@/lib/tenant/pipeline";
import { PUBLIC_EDITORIAL_STATUSES } from "@/lib/newsroom/publish-state";
import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import { createGoogleStt } from "@/lib/user-news/stt";
import type { SubmissionStatus } from "@/lib/user-news/status-machine";
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
  SubmissionRow,
  VerificationEventInput,
} from "@/lib/user-news/types";

type Admin = ReturnType<typeof createAdminServerClient>;
// The generated Database type does not know the new tables yet; the query results are validated by the service layer.
type Q = { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any; storage: Admin["storage"] };

const BUCKET = "user-news-media";
const PUBLIC_BUCKET = "editorial-images";

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T | null {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

export class SupabaseRepo implements Repo {
  private readonly db: Q;
  constructor(admin: Admin = createAdminServerClient()) {
    this.db = admin as unknown as Q;
  }

  async getVerification(userId: string): Promise<VerificationRecord | null> {
    const row = check<{ status: VerificationRecord["status"]; provider: string | null; verified_at: string | null; expires_at: string | null }>(
      await this.db.from("user_verification").select("status,provider,verified_at,expires_at").eq("user_id", userId).maybeSingle(),
      "getVerification"
    );
    return row ? { status: row.status, provider: row.provider, verifiedAt: row.verified_at, expiresAt: row.expires_at } : null;
  }

  async upsertVerification(i: { userId: string; status: VerificationRecord["status"]; provider: string | null; reference: string | null; verifiedAt: string | null; expiresAt: string | null; consentVersion: string | null }) {
    check(
      await this.db.from("user_verification").upsert(
        { user_id: i.userId, status: i.status, provider: i.provider, provider_reference: i.reference, verified_at: i.verifiedAt, expires_at: i.expiresAt, consent_version: i.consentVersion, consent_at: i.consentVersion ? new Date().toISOString() : null },
        { onConflict: "user_id" }
      ),
      "upsertVerification"
    );
  }

  async insertVerificationEvent(e: VerificationEventInput) {
    check(await this.db.from("user_verification_events").insert({ ...e, detail: e.detail ?? {} }), "insertVerificationEvent");
  }

  async insertSubmission(row: Pick<SubmissionRow, "author_id" | "language" | "input_kind" | "raw_text" | "transcript" | "location_text" | "declared_district">) {
    const r = check<SubmissionRow>(await this.db.from("user_news_submissions").insert(row).select("*").single(), "insertSubmission");
    return r!;
  }

  async getSubmission(id: string) {
    return check<SubmissionRow>(await this.db.from("user_news_submissions").select("*").eq("id", id).maybeSingle(), "getSubmission");
  }

  async updateSubmission(id: string, patch: Partial<SubmissionRow>, expectedStatus: SubmissionStatus) {
    const { id: _id, author_id: _author, created_at: _c, updated_at: _u, ...safe } = patch as Record<string, unknown>;
    void _id; void _author; void _c; void _u;
    const res = await this.db.from("user_news_submissions").update(safe).eq("id", id).eq("status", expectedStatus).select("*").maybeSingle();
    return check<SubmissionRow>(res, "updateSubmission");
  }

  async listSubmissionsByAuthor(authorId: string) {
    return check<SubmissionRow[]>(await this.db.from("user_news_submissions").select("*").eq("author_id", authorId).order("created_at", { ascending: false }).limit(200), "listSubmissionsByAuthor") ?? [];
  }

  async listForModeration(statuses: SubmissionStatus[], limit: number) {
    return check<SubmissionRow[]>(await this.db.from("user_news_submissions").select("*").in("status", statuses).order("submitted_at", { ascending: true, nullsFirst: false }).limit(limit), "listForModeration") ?? [];
  }

  async insertRevision(r: Omit<RevisionRow, "id" | "created_at">) {
    check(await this.db.from("user_news_revisions").insert(r), "insertRevision");
  }
  async listRevisions(submissionId: string) {
    return check<RevisionRow[]>(await this.db.from("user_news_revisions").select("*").eq("submission_id", submissionId).order("created_at", { ascending: true }), "listRevisions") ?? [];
  }
  async insertModeration(m: Omit<ModerationRow, "id" | "created_at">) {
    check(await this.db.from("user_news_moderation").insert(m), "insertModeration");
  }
  async listModeration(submissionId: string) {
    return check<ModerationRow[]>(await this.db.from("user_news_moderation").select("*").eq("submission_id", submissionId).order("created_at", { ascending: true }), "listModeration") ?? [];
  }

  async insertMedia(m: Parameters<Repo["insertMedia"]>[0]) {
    return check<MediaRow>(await this.db.from("user_news_media").insert(m).select("*").single(), "insertMedia")!;
  }
  async getMedia(id: string) {
    return check<MediaRow>(await this.db.from("user_news_media").select("*").eq("id", id).maybeSingle(), "getMedia");
  }
  async updateMedia(id: string, patch: Partial<MediaRow>) {
    check(await this.db.from("user_news_media").update(patch).eq("id", id), "updateMedia");
  }
  async listMedia(submissionId: string) {
    return check<MediaRow[]>(await this.db.from("user_news_media").select("*").eq("submission_id", submissionId).order("created_at", { ascending: true }), "listMedia") ?? [];
  }

  async countAiDraftsSince(authorId: string, sinceIso: string) {
    const res = await this.db.from("platform_audit_events").select("id", { count: "exact", head: true }).eq("action", "user_news.ai_draft").eq("actor_id", authorId).gte("created_at", sinceIso);
    if (res.error) throw new Error(`countAiDraftsSince: ${res.error.message}`);
    return Number(res.count ?? 0);
  }
  async countSubmissionsSince(authorId: string, sinceIso: string) {
    const res = await this.db.from("user_news_submissions").select("id", { count: "exact", head: true }).eq("author_id", authorId).gte("created_at", sinceIso);
    if (res.error) throw new Error(`countSubmissionsSince: ${res.error.message}`);
    return Number(res.count ?? 0);
  }
  async recentPublishedHeadlines(limit: number) {
    const rows = check<Array<{ headline: string }>>(await this.db.from("generated_articles").select("headline").in("editorial_status", [...PUBLIC_EDITORIAL_STATUSES]).not("published_at", "is", null).order("published_at", { ascending: false }).limit(limit), "recentPublishedHeadlines") ?? [];
    return rows.map((r) => r.headline);
  }

  async audit(e: AuditEvent) {
    check(await this.db.from("platform_audit_events").insert({ ...e, detail: e.detail ?? {} }), "audit");
  }

  async publishArticle(row: GeneratedArticleInsert) {
    // Upsert by id: the article id IS the submission id, so a retried publish updates the same row instead of creating a second one.
    check(await this.db.from("generated_articles").upsert({ ...row, tenant_id: row.tenant_id ?? getPipelineTenantId(), translations: {} }, { onConflict: "id" }), "publishArticle");
  }

  async unpublishArticle(articleId: string) {
    // generated_articles only allows editorial_status pending|approved|rejected. 'rejected' + workflow 'archived' is non-public
    // everywhere (feeds, RSS, sitemap, search) and nothing is deleted, so a takedown is reversible.
    check(await this.db.from("generated_articles").update({ editorial_status: "rejected", workflow_status: "archived" }).eq("id", articleId), "unpublishArticle");
  }

  async getAuthorDisplayName(userId: string) {
    const row = check<{ display_name: string | null }>(await this.db.from("reader_profiles").select("display_name").eq("user_id", userId).maybeSingle(), "getAuthorDisplayName");
    return row?.display_name?.trim() || null;
  }

  async myStats(authorId: string) {
    const res = await this.db.rpc("user_news_my_stats", { p_author: authorId });
    if (res.error) throw new Error(`myStats: ${res.error.message}`);
    return (res.data ?? []) as Array<Record<string, unknown>>;
  }
}

export class SupabaseMediaStorage implements MediaStorage {
  private readonly admin: Admin;
  constructor(admin: Admin = createAdminServerClient()) {
    this.admin = admin;
  }
  private bucket() {
    return this.admin.storage.from(BUCKET);
  }

  async createSignedUpload(path: string) {
    const { data, error } = await this.bucket().createSignedUploadUrl(path);
    if (error || !data) throw new Error(`createSignedUpload: ${error?.message ?? "no data"}`);
    return { path: data.path, token: data.token, signedUrl: data.signedUrl };
  }

  async download(path: string, opts?: { start?: number; maxBytes?: number }) {
    // A signed URL + HTTP Range lets us read a video's head and tail without pulling up to 100 MB into memory.
    const { data, error } = await this.bucket().createSignedUrl(path, 120);
    if (error || !data) throw new Error(`download: ${error?.message ?? "no url"}`);
    const start = opts?.start ?? 0;
    const headers: Record<string, string> = opts?.maxBytes ? { Range: `bytes=${start}-${start + opts.maxBytes - 1}` } : {};
    const res = await fetch(data.signedUrl, { headers, signal: AbortSignal.timeout(60_000) });
    if (!res.ok && res.status !== 206) throw new Error(`download: HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  async statSize(path: string) {
    const folder = path.slice(0, path.lastIndexOf("/"));
    const name = path.slice(path.lastIndexOf("/") + 1);
    const { data, error } = await this.bucket().list(folder, { search: name, limit: 5 });
    if (error) throw new Error(`statSize: ${error.message}`);
    const hit = (data ?? []).find((o) => o.name === name);
    const size = (hit?.metadata as { size?: number } | undefined)?.size;
    return typeof size === "number" ? size : null;
  }

  async uploadPrivate(path: string, bytes: Uint8Array, mime: string) {
    const { error } = await this.bucket().upload(path, bytes, { contentType: mime, upsert: true });
    if (error) throw new Error(`uploadPrivate: ${error.message}`);
  }

  async uploadPublic(path: string, bytes: Uint8Array, mime: string) {
    const pub = this.admin.storage.from(PUBLIC_BUCKET);
    const { error } = await pub.upload(path, bytes, { contentType: mime, upsert: true, cacheControl: "31536000" });
    if (error) throw new Error(`uploadPublic: ${error.message}`);
    return pub.getPublicUrl(path).data.publicUrl;
  }

  async signedReadUrl(path: string, ttlSeconds: number) {
    const { data, error } = await this.bucket().createSignedUrl(path, ttlSeconds);
    if (error || !data) throw new Error(`signedReadUrl: ${error?.message ?? "no url"}`);
    return data.signedUrl;
  }
}

/** Production wiring for route handlers. */
export async function createProductionDeps(): Promise<Deps> {
  const { requestChatCompletion } = await import("@/lib/ai/providers/chat");
  return {
    repo: new SupabaseRepo(),
    storage: new SupabaseMediaStorage(),
    chat: requestChatCompletion,
    stt: createGoogleStt(process.env),
    now: () => new Date(),
    env: process.env,
    revalidateFeeds: () => void revalidateNewsroomCaches({ publishedStories: 1 }),
  };
}
