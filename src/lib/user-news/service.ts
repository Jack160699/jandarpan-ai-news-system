/**
 * User-news service: every flow of Post News, written against ports (types.ts) so it is fully testable.
 *
 * Non-negotiable rules this file enforces (each has tests):
 *   - Every write by a user passes the verification gate (evaluatePostGate); an unverified user can read My News and withdraw, nothing else.
 *   - A user only ever touches their own submissions (a stranger's id is a 404, not a 403: existence is not leaked).
 *   - The author's status moves only along the state machine; the AI never approves; only a moderator approves / rejects / blocks.
 *   - A story needs the author's explicit approval (and no blocking fact / risk flag, a publishable geography and a fit headline) before it
 *     can be submitted, and a moderator's explicit decision before it is published. Publishing is idempotent.
 *   - Everything important writes an append-only audit event.
 *   - Only the re-encoded, EXIF-stripped image derivative ever becomes public.
 */

import { randomUUID, createHash } from "node:crypto";
import { assertTransition, canTransition, isAuthorEditable, type SubmissionStatus } from "@/lib/user-news/status-machine";
import { evaluatePostGate, effectiveStatus, NO_VERIFICATION, verificationAvailability, type VerificationRecord } from "@/lib/user-news/verification";
import { generateUserNewsDraft, MIN_SOURCE_CHARS, MAX_SOURCE_CHARS, type UserNewsDraftFields } from "@/lib/user-news/ai-draft";
import { findAiFabrications, findUnsupportedFacts, hasBlockingFlags } from "@/lib/user-news/fact-check";
import { detectRiskFlags, hasBlockingRisk, type RiskFlag } from "@/lib/user-news/risk-flags";
import { canPublishAsDistrict, resolveSubmissionGeo, toGeoMetadata, type SubmissionGeo } from "@/lib/user-news/submission-geo";
import {
  MEDIA_LIMITS,
  VOICE_LIMITS,
  AUDIO_MIME,
  IMAGE_MIME,
  VIDEO_MIME,
  checkLandscape,
  checkMediaBytes,
  checkVideoDuration,
  checkVoiceBytes,
  extensionForMime,
  findMoovBox,
  readImageDimensions,
  readMp4Info,
} from "@/lib/user-news/media-validate";
import { processImage, ImageProcessingError } from "@/lib/user-news/media-process";
import { isHeadlineFitForPublicFeed } from "@/lib/news/quality/headline-quality";
import { optimizeSeoSlug } from "@/lib/seo/slug-optimize";
import { fail, type Deps, type MediaRow, type ModerationDecision, type ModerationRow, type Result, type RevisionRow, type SubmissionRow, type UserNewsLanguage } from "@/lib/user-news/types";

const DAY_MS = 24 * 3_600_000;

export function limits(env: Record<string, string | undefined>) {
  const n = (k: string, d: number) => {
    const v = Number(env[k]);
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : d;
  };
  return {
    aiDraftsPerDay: n("USER_NEWS_AI_DRAFTS_PER_DAY", 10),
    submissionsPerDay: n("USER_NEWS_SUBMISSIONS_PER_DAY", 5),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// shared helpers
// ---------------------------------------------------------------------------------------------------------------------

async function gate(deps: Deps, userId: string): Promise<Result<{ record: VerificationRecord }>> {
  const record = (await deps.repo.getVerification(userId)) ?? NO_VERIFICATION;
  const g = evaluatePostGate({ userId, record, env: deps.env, now: deps.now() });
  if (g.allowed) return { ok: true, record };
  const status = g.reason === "not_authenticated" ? 401 : 403;
  return fail(status, g.reason, g.message, { verification: effectiveStatus(record, deps.now()) });
}

async function loadOwned(deps: Deps, userId: string, id: string): Promise<Result<{ row: SubmissionRow }>> {
  const row = await deps.repo.getSubmission(id);
  // A stranger's submission looks exactly like a missing one.
  if (!row || row.author_id !== userId) return fail(404, "not_found", "That story was not found.");
  return { ok: true, row };
}

const sourceOf = (row: Pick<SubmissionRow, "raw_text" | "transcript">) => [row.raw_text, row.transcript].filter((s): s is string => Boolean(s && s.trim())).join("\n\n");
const textOf = (r: Pick<SubmissionRow, "headline" | "subheadline" | "summary" | "body">) => [r.headline, r.subheadline, r.summary, r.body].filter(Boolean).join("\n");

async function latestAiDraftText(deps: Deps, id: string): Promise<string | null> {
  const revs = await deps.repo.listRevisions(id);
  const ai = [...revs].reverse().find((r) => r.kind === "ai_draft");
  if (!ai) return null;
  const s = ai.snapshot as Partial<UserNewsDraftFields>;
  return [s.headline, s.subheadline, s.summary, s.body].filter(Boolean).join("\n");
}

function readinessProblems(row: SubmissionRow): string[] {
  const problems: string[] = [];
  if (!row.headline || !row.summary || !row.body) problems.push("The headline, summary and story text are all required.");
  if (row.headline && !isHeadlineFitForPublicFeed(row.headline)) problems.push("The headline is too generic. Say what happened and where.");
  if (hasBlockingFlags(row.fact_flags ?? [])) problems.push("Some details were added by the AI and are not in what you said. Remove them first.");
  if (hasBlockingRisk(row.risk_flags ?? [])) problems.push("The story contains something that cannot be published (for example a phone number, an email address or an ID number). Remove it first.");
  const scope = row.geo?.scope;
  if (!scope || scope === "UNKNOWN") problems.push("Say where this happened (town or district) so readers can find it.");
  return problems;
}

// ---------------------------------------------------------------------------------------------------------------------
// verification (server-side writes only)
// ---------------------------------------------------------------------------------------------------------------------

export async function recordVerification(
  deps: Deps,
  input: { userId: string; status: "verified" | "rejected" | "pending" | "revoked"; provider: string; reference: string; verifiedAt?: string | null; expiresAt?: string | null; consentVersion?: string | null; actorKind: "provider" | "admin" | "system"; actorId?: string | null }
): Promise<Result<{ status: string }>> {
  const before = await deps.repo.getVerification(input.userId);
  await deps.repo.upsertVerification({
    userId: input.userId,
    status: input.status,
    provider: input.provider,
    reference: input.reference,
    verifiedAt: input.status === "verified" ? input.verifiedAt ?? deps.now().toISOString() : before?.verifiedAt ?? null,
    expiresAt: input.expiresAt ?? null,
    consentVersion: input.consentVersion ?? null,
  });
  await deps.repo.insertVerificationEvent({
    user_id: input.userId,
    from_status: before?.status ?? null,
    to_status: input.status,
    actor_kind: input.actorKind,
    actor_id: input.actorId ?? null,
    provider: input.provider,
    reference: input.reference,
  });
  await deps.repo.audit({ actor_id: input.actorId ?? null, actor_kind: input.actorKind === "admin" ? "admin" : "provider", action: "verification.changed", entity_type: "user", entity_id: input.userId, detail: { from: before?.status ?? "unverified", to: input.status, provider: input.provider } });
  return { ok: true, status: input.status };
}

// ---------------------------------------------------------------------------------------------------------------------
// authoring
// ---------------------------------------------------------------------------------------------------------------------

export async function createSubmission(
  deps: Deps,
  userId: string,
  input: { language: UserNewsLanguage; text?: string | null; locationText?: string | null; declaredDistrict?: string | null }
): Promise<Result<{ submission: SubmissionRow }>> {
  const g = await gate(deps, userId);
  if (!g.ok) return g;
  const text = (input.text ?? "").trim();
  if (text.length > MAX_SOURCE_CHARS) return fail(422, "source_too_long", "That is too long. Please keep the report under about 1,000 words.");

  const since = new Date(deps.now().getTime() - DAY_MS).toISOString();
  if ((await deps.repo.countSubmissionsSince(userId, since)) >= limits(deps.env).submissionsPerDay) {
    return fail(429, "daily_limit", "You have reached today's limit for new stories. Please try again tomorrow.");
  }

  const row = await deps.repo.insertSubmission({
    author_id: userId,
    language: input.language,
    input_kind: "text",
    raw_text: text || null,
    transcript: null,
    location_text: input.locationText?.trim() || null,
    declared_district: input.declaredDistrict?.trim() || null,
  });
  await deps.repo.insertRevision({ submission_id: row.id, version: 1, kind: "source", actor_id: userId, snapshot: { raw_text: text, location_text: row.location_text, declared_district: row.declared_district } });
  await deps.repo.audit({ actor_id: userId, actor_kind: "user", action: "user_news.created", entity_type: "user_news_submission", entity_id: row.id, detail: { language: input.language } });
  return { ok: true, submission: row };
}

export async function updateSource(
  deps: Deps,
  userId: string,
  id: string,
  input: { text?: string | null; locationText?: string | null; declaredDistrict?: string | null }
): Promise<Result<{ submission: SubmissionRow }>> {
  const g = await gate(deps, userId);
  if (!g.ok) return g;
  const o = await loadOwned(deps, userId, id);
  if (!o.ok) return o;
  if (o.row.status !== "draft" && o.row.status !== "ai_generated") return fail(409, "not_editable", "This story can no longer be changed.");
  const text = (input.text ?? o.row.raw_text ?? "").trim();
  if (text.length > MAX_SOURCE_CHARS) return fail(422, "source_too_long", "That is too long. Please keep the report under about 1,000 words.");
  const updated = await deps.repo.updateSubmission(
    id,
    { raw_text: text || null, location_text: input.locationText === undefined ? o.row.location_text : input.locationText?.trim() || null, declared_district: input.declaredDistrict === undefined ? o.row.declared_district : input.declaredDistrict?.trim() || null, version: o.row.version + 1 },
    o.row.status
  );
  if (!updated) return fail(409, "conflict", "The story changed while you were editing. Reload and try again.");
  await deps.repo.insertRevision({ submission_id: id, version: updated.version, kind: "source", actor_id: userId, snapshot: { raw_text: text, location_text: updated.location_text, declared_district: updated.declared_district } });
  return { ok: true, submission: updated };
}

export async function generateDraft(deps: Deps, userId: string, id: string): Promise<Result<{ submission: SubmissionRow; factFlags: unknown[]; riskFlags: RiskFlag[] }>> {
  const g = await gate(deps, userId);
  if (!g.ok) return g;
  const o = await loadOwned(deps, userId, id);
  if (!o.ok) return o;
  const row = o.row;
  if (row.status !== "draft" && row.status !== "ai_generated") return fail(409, "not_editable", "A draft can only be created before the story is approved.");

  const since = new Date(deps.now().getTime() - DAY_MS).toISOString();
  if ((await deps.repo.countAiDraftsSince(userId, since)) >= limits(deps.env).aiDraftsPerDay) {
    return fail(429, "ai_daily_limit", "You have used today's AI drafts. You can edit your current draft or try again tomorrow.");
  }

  const result = await generateUserNewsDraft(
    { language: row.language, text: row.raw_text, transcript: row.transcript, locationHint: row.location_text, declaredDistrict: row.declared_district, recentHeadlines: await deps.repo.recentPublishedHeadlines(60) },
    deps.chat
  );
  if (!result.ok) {
    const status = result.error === "provider_error" ? 503 : 422;
    await deps.repo.audit({ actor_id: userId, actor_kind: "user", action: "user_news.ai_draft_failed", entity_type: "user_news_submission", entity_id: id, detail: { error: result.error } });
    return fail(status, result.error, result.message);
  }

  const d = result.draft;
  const updated = await deps.repo.updateSubmission(
    id,
    {
      status: "ai_generated",
      headline: d.headline,
      subheadline: d.subheadline || null,
      summary: d.summary,
      body: d.body,
      location_text: d.location || row.location_text,
      category: d.category,
      tags: d.tags,
      geo: result.geo as unknown as SubmissionRow["geo"],
      fact_flags: result.factFlags,
      risk_flags: result.riskFlags,
      ai_meta: { ...result.ai, suggestedDistrict: d.district_suggestion ?? null },
      version: row.version + 1,
    },
    row.status
  );
  if (!updated) return fail(409, "conflict", "The story changed while the draft was being written. Reload and try again.");
  await deps.repo.insertRevision({ submission_id: id, version: updated.version, kind: "ai_draft", actor_id: null, snapshot: { ...d, ai: result.ai, factFlags: result.factFlags } });
  await deps.repo.audit({ actor_id: userId, actor_kind: "system", action: "user_news.ai_draft", entity_type: "user_news_submission", entity_id: id, detail: { provider: result.ai.provider, model: result.ai.model, repaired: result.ai.repaired } });
  return { ok: true, submission: updated, factFlags: result.factFlags, riskFlags: result.riskFlags };
}

export type EditFields = { headline?: string; subheadline?: string | null; summary?: string; body?: string; locationText?: string | null; declaredDistrict?: string | null; category?: string | null; tags?: string[] };

export async function saveEdit(deps: Deps, userId: string, id: string, fields: EditFields): Promise<Result<{ submission: SubmissionRow }>> {
  const g = await gate(deps, userId);
  if (!g.ok) return g;
  const o = await loadOwned(deps, userId, id);
  if (!o.ok) return o;
  const row = o.row;
  if (!isAuthorEditable(row.status)) return fail(409, "not_editable", "This story is with the moderators and can no longer be edited.");
  if (row.status === "draft") return fail(409, "no_draft", "Create the AI draft first, then edit it.");

  const next = {
    headline: fields.headline ?? row.headline,
    subheadline: fields.subheadline === undefined ? row.subheadline : fields.subheadline,
    summary: fields.summary ?? row.summary,
    body: fields.body ?? row.body,
  };
  const locationText = fields.locationText === undefined ? row.location_text : fields.locationText;
  const declaredDistrict = fields.declaredDistrict === undefined ? row.declared_district : fields.declaredDistrict;

  const source = sourceOf(row);
  const aiText = await latestAiDraftText(deps, id);
  // Only the AI is held to the source: a fact the author types themselves is the author's own claim.
  const factFlags = aiText ? findAiFabrications({ sourceText: source, aiDraftText: aiText, finalText: textOf(next) }) : findUnsupportedFacts(source, textOf(next));
  const riskFlags = detectRiskFlags({ text: `${textOf(next)}`, headline: next.headline ?? undefined, recentHeadlines: await deps.repo.recentPublishedHeadlines(60) });
  const geo: SubmissionGeo = resolveSubmissionGeo({ headline: next.headline ?? "", summary: next.summary, body: next.body, location: locationText, declaredDistrict, moderatorConfirmedDistrict: row.moderator_confirmed_district });

  // Editing an approved story takes it back to "AI draft ready": the author must approve the new text again.
  const nextStatus: SubmissionStatus = row.status === "user_approved" ? "ai_generated" : row.status;
  if (nextStatus !== row.status) assertTransition(row.status, nextStatus, "author");

  const updated = await deps.repo.updateSubmission(
    id,
    { ...next, location_text: locationText, declared_district: declaredDistrict, category: fields.category === undefined ? row.category : fields.category, tags: fields.tags ?? row.tags, geo: geo as unknown as SubmissionRow["geo"], fact_flags: factFlags, risk_flags: riskFlags, status: nextStatus, version: row.version + 1 },
    row.status
  );
  if (!updated) return fail(409, "conflict", "The story changed while you were editing. Reload and try again.");
  await deps.repo.insertRevision({ submission_id: id, version: updated.version, kind: "user_edit", actor_id: userId, snapshot: { ...next, locationText, declaredDistrict } });
  await deps.repo.audit({ actor_id: userId, actor_kind: "user", action: "user_news.edited", entity_type: "user_news_submission", entity_id: id, detail: { version: updated.version } });
  return { ok: true, submission: updated };
}

export async function approveByAuthor(deps: Deps, userId: string, id: string): Promise<Result<{ submission: SubmissionRow }>> {
  const g = await gate(deps, userId);
  if (!g.ok) return g;
  const o = await loadOwned(deps, userId, id);
  if (!o.ok) return o;
  const row = o.row;
  if (!canTransition(row.status, "user_approved", "author")) return fail(409, "invalid_state", "This story cannot be approved right now.");
  const problems = readinessProblems(row);
  if (problems.length) return fail(422, "not_ready", problems[0]!, { problems });
  const updated = await deps.repo.updateSubmission(id, { status: "user_approved", user_approved_at: deps.now().toISOString() }, row.status);
  if (!updated) return fail(409, "conflict", "The story changed. Reload and try again.");
  await deps.repo.audit({ actor_id: userId, actor_kind: "user", action: "user_news.user_approved", entity_type: "user_news_submission", entity_id: id, detail: { version: row.version } });
  return { ok: true, submission: updated };
}

export async function submitForModeration(deps: Deps, userId: string, id: string): Promise<Result<{ submission: SubmissionRow }>> {
  const g = await gate(deps, userId);
  if (!g.ok) return g;
  const o = await loadOwned(deps, userId, id);
  if (!o.ok) return o;
  const row = o.row;
  if (row.status !== "user_approved" || !row.user_approved_at) return fail(409, "approval_required", "Approve your story first, then submit it.");
  const problems = readinessProblems(row);
  if (problems.length) return fail(422, "not_ready", problems[0]!, { problems });
  const media = await deps.repo.listMedia(id);
  if (media.some((m) => m.processing_status === "rejected" || m.processing_status === "failed")) {
    return fail(422, "media_problem", "One of your pictures or videos has a problem. Remove it or upload a different one.");
  }
  const updated = await deps.repo.updateSubmission(id, { status: "submitted", submitted_at: deps.now().toISOString() }, "user_approved");
  if (!updated) return fail(409, "conflict", "The story changed. Reload and try again.");
  await deps.repo.audit({ actor_id: userId, actor_kind: "user", action: "user_news.submitted", entity_type: "user_news_submission", entity_id: id });
  return { ok: true, submission: updated };
}

export async function withdraw(deps: Deps, userId: string, id: string): Promise<Result<{ submission: SubmissionRow }>> {
  const o = await loadOwned(deps, userId, id); // no verification gate: an author can always withdraw their own story
  if (!o.ok) return o;
  const row = o.row;
  if (!canTransition(row.status, "withdrawn", "author")) return fail(409, "invalid_state", "This story cannot be withdrawn.");
  if (row.status === "published" && row.published_article_id) await deps.repo.unpublishArticle(row.published_article_id);
  const updated = await deps.repo.updateSubmission(id, { status: "withdrawn" }, row.status);
  if (!updated) return fail(409, "conflict", "The story changed. Reload and try again.");
  await deps.repo.audit({ actor_id: userId, actor_kind: "user", action: row.status === "published" ? "user_news.unpublished_by_author" : "user_news.withdrawn", entity_type: "user_news_submission", entity_id: id });
  if (row.status === "published") deps.revalidateFeeds();
  return { ok: true, submission: updated };
}

// ---------------------------------------------------------------------------------------------------------------------
// media (direct-to-storage uploads; the server validates the BYTES afterwards)
// ---------------------------------------------------------------------------------------------------------------------

export type MediaKindInput = "image" | "video" | "voice";

export async function createMediaSlot(
  deps: Deps,
  userId: string,
  id: string,
  input: { kind: MediaKindInput; mime: string; sizeBytes: number }
): Promise<Result<{ mediaId: string; upload: { signedUrl: string; token: string; path: string } }>> {
  const g = await gate(deps, userId);
  if (!g.ok) return g;
  const o = await loadOwned(deps, userId, id);
  if (!o.ok) return o;
  if (!isAuthorEditable(o.row.status)) return fail(409, "not_editable", "Media can only be added before the story is submitted.");

  const mime = input.mime.toLowerCase().split(";")[0]!.trim();
  const allowed: readonly string[] = input.kind === "image" ? IMAGE_MIME : input.kind === "video" ? VIDEO_MIME : AUDIO_MIME;
  const maxBytes = input.kind === "image" ? MEDIA_LIMITS.imageMaxBytes : input.kind === "video" ? MEDIA_LIMITS.videoMaxBytes : VOICE_LIMITS.maxBytes;
  if (!allowed.includes(mime) && !(input.kind === "voice" && mime === "video/webm")) return fail(422, "unsupported_type", "That file type is not accepted.");
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > maxBytes) return fail(422, "too_large", `The file must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`);

  const existing = await deps.repo.listMedia(id);
  const count = (k: MediaKindInput) => existing.filter((m) => m.kind === k && m.processing_status !== "rejected" && m.processing_status !== "failed").length;
  if (input.kind === "image" && count("image") >= MEDIA_LIMITS.maxImages) return fail(422, "too_many", `You can add up to ${MEDIA_LIMITS.maxImages} pictures.`);
  if (input.kind === "video" && count("video") >= MEDIA_LIMITS.maxVideos) return fail(422, "too_many", "You can add one video.");
  if (input.kind === "voice" && count("voice") >= 1) return fail(422, "too_many", "You can add one voice note.");

  // The path is chosen by the server from ids it controls: never from a client filename.
  const ext = extensionForMime(mime === "video/webm" && input.kind === "voice" ? "audio/webm" : mime);
  const path = `${userId}/${id}/${randomUUID()}.${ext}`;
  const upload = await deps.storage.createSignedUpload(path);
  const media = await deps.repo.insertMedia({ submission_id: id, owner_id: userId, kind: input.kind, storage_path: path, original_mime: mime, size_bytes: Math.floor(input.sizeBytes) });
  await deps.repo.audit({ actor_id: userId, actor_kind: "user", action: "user_news.media_slot", entity_type: "user_news_media", entity_id: media.id, detail: { kind: input.kind, mime, size: input.sizeBytes } });
  return { ok: true, mediaId: media.id, upload };
}

const TAIL_BYTES = 4 * 1024 * 1024;
const HEAD_BYTES = 4 * 1024 * 1024;

export async function finalizeMedia(deps: Deps, userId: string, mediaId: string): Promise<Result<{ media: MediaRow }>> {
  const g = await gate(deps, userId);
  if (!g.ok) return g;
  const media = await deps.repo.getMedia(mediaId);
  if (!media || media.owner_id !== userId) return fail(404, "not_found", "That file was not found.");
  const sub = await deps.repo.getSubmission(media.submission_id);
  if (!sub || sub.author_id !== userId) return fail(404, "not_found", "That file was not found.");
  if (media.processing_status === "ready") return { ok: true, media };

  const reject = async (code: string, message: string): Promise<Result<{ media: MediaRow }>> => {
    await deps.repo.updateMedia(mediaId, { processing_status: "rejected", validation: { code, message } });
    await deps.repo.audit({ actor_id: userId, actor_kind: "user", action: "user_news.media_rejected", entity_type: "user_news_media", entity_id: mediaId, detail: { code } });
    return fail(422, code, message);
  };

  // The size comes from storage, never from what the client said.
  const size = await deps.storage.statSize(media.storage_path);
  if (size === null) return fail(409, "not_uploaded", "The file has not finished uploading.");

  await deps.repo.updateMedia(mediaId, { processing_status: "processing", size_bytes: size });

  if (media.kind === "image") {
    if (size > MEDIA_LIMITS.imageMaxBytes) return reject("too_large", "The picture is larger than 10 MB.");
    const bytes = await deps.storage.download(media.storage_path);
    const check = checkMediaBytes({ declaredMime: media.original_mime, sizeBytes: size, head: bytes.slice(0, 64) });
    if (!check.ok) return reject(check.code, check.message);
    if (check.kind !== "image") return reject("mime_mismatch", "This is not a picture.");
    const header = readImageDimensions(bytes);
    const dims = checkLandscape("image", header?.width, header?.height);
    if (!dims.ok) return reject(dims.code, dims.message);
    try {
      const processed = await processImage(bytes);
      const base = media.storage_path.replace(/\.[a-z0-9]+$/i, "");
      await deps.storage.uploadPrivate(`${base}.optimized.webp`, processed.optimized.bytes, "image/webp");
      await deps.storage.uploadPrivate(`${base}.thumb.webp`, processed.thumbnail.bytes, "image/webp");
      await deps.repo.updateMedia(mediaId, {
        processing_status: "ready",
        optimized_path: `${base}.optimized.webp`,
        thumbnail_path: `${base}.thumb.webp`,
        width: processed.width,
        height: processed.height,
        checksum_sha256: createHash("sha256").update(bytes).digest("hex"),
        validation: { hadMetadata: processed.hadMetadata, exifStripped: true },
      });
    } catch (e) {
      if (e instanceof ImageProcessingError) return reject(e.code, e.message);
      await deps.repo.updateMedia(mediaId, { processing_status: "failed", validation: { code: "processing_failed" } });
      return fail(500, "processing_failed", "The picture could not be processed. Please try another one.");
    }
  } else if (media.kind === "video") {
    if (size > MEDIA_LIMITS.videoMaxBytes) return reject("too_large", "The video is larger than 100 MB.");
    const head = await deps.storage.download(media.storage_path, { maxBytes: HEAD_BYTES });
    const check = checkMediaBytes({ declaredMime: media.original_mime, sizeBytes: size, head });
    if (!check.ok) return reject(check.code, check.message);
    if (check.kind !== "video") return reject("mime_mismatch", "This is not a video.");

    let info = check.mime === "video/mp4" ? readMp4Info(head) : { durationMs: null, width: null, height: null };
    if (check.mime === "video/mp4" && (info.durationMs === null || info.width === null) && size > HEAD_BYTES) {
      const tail = await deps.storage.download(media.storage_path, { start: Math.max(0, size - TAIL_BYTES), maxBytes: TAIL_BYTES });
      const moov = findMoovBox(tail);
      if (moov) info = readMp4Info(moov);
    }
    if (info.width === null || info.durationMs === null) {
      // Not provable from the container bytes (WebM, or an MP4 whose index we could not read): keep it, but flag it for a human and
      // for the out-of-band video processor. It is never reported as ready.
      await deps.repo.updateMedia(mediaId, { processing_status: "pending", validation: { needsProbe: true, note: "dimensions and duration could not be read from the container" } });
      const pending = await deps.repo.getMedia(mediaId);
      return { ok: true, media: pending! };
    }
    const dur = checkVideoDuration(info.durationMs);
    if (!dur.ok) return reject(dur.code, dur.message);
    const dims = checkLandscape("video", info.width, info.height);
    if (!dims.ok) return reject(dims.code, dims.message);
    await deps.repo.updateMedia(mediaId, {
      processing_status: "ready",
      width: info.width,
      height: info.height,
      duration_ms: info.durationMs,
      validation: { posterGenerated: false, note: "no video transcoder on this runtime; the picture is used as the story's hero image" },
    });
  } else {
    if (size > VOICE_LIMITS.maxBytes) return reject("too_large", "The recording is larger than 10 MB.");
    const head = await deps.storage.download(media.storage_path, { maxBytes: 64 });
    const check = checkVoiceBytes({ declaredMime: media.original_mime, sizeBytes: size, head });
    if (!check.ok) return reject(check.code, check.message);
    await deps.repo.updateMedia(mediaId, { processing_status: "ready", validation: { mime: check.mime } });
  }

  await deps.repo.audit({ actor_id: userId, actor_kind: "user", action: "user_news.media_ready", entity_type: "user_news_media", entity_id: mediaId, detail: { kind: media.kind } });
  const done = await deps.repo.getMedia(mediaId);
  return { ok: true, media: done! };
}

export async function transcribeVoice(deps: Deps, userId: string, id: string, mediaId: string): Promise<Result<{ submission: SubmissionRow; transcript: string }>> {
  const g = await gate(deps, userId);
  if (!g.ok) return g;
  const o = await loadOwned(deps, userId, id);
  if (!o.ok) return o;
  if (o.row.status !== "draft" && o.row.status !== "ai_generated") return fail(409, "not_editable", "A voice note can only be added before the story is approved.");
  const media = await deps.repo.getMedia(mediaId);
  if (!media || media.owner_id !== userId || media.submission_id !== id || media.kind !== "voice") return fail(404, "not_found", "That recording was not found.");
  if (media.processing_status !== "ready") return fail(409, "not_ready", "The recording has not finished uploading.");

  const bytes = await deps.storage.download(media.storage_path);
  const stt = await deps.stt({ bytes, mime: media.original_mime, language: o.row.language });
  if (!stt.ok) {
    const status = stt.error === "unconfigured" ? 503 : stt.error === "no_speech" ? 422 : 502;
    return fail(status, `stt_${stt.error}`, stt.message);
  }
  const transcript = stt.transcript.trim().slice(0, MAX_SOURCE_CHARS);
  if (transcript.length < 3) return fail(422, "stt_no_speech", "We could not hear anything in the recording.");
  const kind = o.row.raw_text ? "text_and_voice" : "voice";
  const updated = await deps.repo.updateSubmission(id, { transcript, input_kind: kind, version: o.row.version + 1 }, o.row.status);
  if (!updated) return fail(409, "conflict", "The story changed. Reload and try again.");
  await deps.repo.insertRevision({ submission_id: id, version: updated.version, kind: "transcript", actor_id: null, snapshot: { transcript, confidence: stt.confidence, durationMs: stt.durationMs } });
  await deps.repo.audit({ actor_id: userId, actor_kind: "system", action: "user_news.transcribed", entity_type: "user_news_submission", entity_id: id, detail: { chars: transcript.length, confidence: stt.confidence } });
  return { ok: true, submission: updated, transcript };
}

/** The author can correct what the speech recogniser heard before the AI uses it. */
export async function editTranscript(deps: Deps, userId: string, id: string, transcript: string): Promise<Result<{ submission: SubmissionRow }>> {
  const g = await gate(deps, userId);
  if (!g.ok) return g;
  const o = await loadOwned(deps, userId, id);
  if (!o.ok) return o;
  if (o.row.status !== "draft" && o.row.status !== "ai_generated") return fail(409, "not_editable", "This story can no longer be changed.");
  const t = transcript.trim().slice(0, MAX_SOURCE_CHARS);
  const updated = await deps.repo.updateSubmission(id, { transcript: t || null, version: o.row.version + 1 }, o.row.status);
  if (!updated) return fail(409, "conflict", "The story changed. Reload and try again.");
  await deps.repo.insertRevision({ submission_id: id, version: updated.version, kind: "transcript", actor_id: userId, snapshot: { transcript: t, editedByAuthor: true } });
  return { ok: true, submission: updated };
}

// ---------------------------------------------------------------------------------------------------------------------
// moderation and publication
// ---------------------------------------------------------------------------------------------------------------------

export type ModerateInput = {
  decision: ModerationDecision;
  reasonCode?: string | null;
  reasonText?: string | null;
  /** The moderator saw every review-level flag and decided anyway. Required to approve a story that carries any. */
  acknowledgeFlags?: boolean;
  confirmDistrict?: string | null;
  edits?: { headline?: string; subheadline?: string | null; summary?: string; body?: string };
};

export async function moderate(deps: Deps, moderatorId: string, id: string, input: ModerateInput): Promise<Result<{ submission: SubmissionRow }>> {
  const row0 = await deps.repo.getSubmission(id);
  if (!row0) return fail(404, "not_found", "That story was not found.");
  if (row0.author_id === moderatorId) return fail(403, "own_story", "You cannot moderate your own story.");
  const reason = (input.reasonText ?? "").trim();
  const record = async (decision: ModerationDecision) =>
    deps.repo.insertModeration({ submission_id: id, moderator_id: moderatorId, decision, reason_code: input.reasonCode ?? null, reason_text: reason || null, flags: [...(row0.risk_flags ?? []), ...(row0.fact_flags ?? [])] });
  const audit = (action: string, detail: Record<string, unknown> = {}) =>
    deps.repo.audit({ actor_id: moderatorId, actor_kind: "moderator", action, entity_type: "user_news_submission", entity_id: id, detail: { decision: input.decision, ...detail } });

  // Pick the story up for review (submitted -> under_review) as part of the first decision.
  let row = row0;
  if (row.status === "submitted") {
    const picked = await deps.repo.updateSubmission(id, { status: "under_review", reviewer_id: moderatorId }, "submitted");
    if (!picked) return fail(409, "conflict", "Another moderator picked this story up. Reload.");
    row = picked;
  }

  const need = (statuses: SubmissionStatus[]) => statuses.includes(row.status);

  switch (input.decision) {
    case "hold": {
      if (!need(["under_review"])) return fail(409, "invalid_state", "Only a story under review can be put on hold.");
      await record("hold");
      await audit("user_news.held");
      return { ok: true, submission: row };
    }
    case "confirm_district": {
      if (!need(["under_review"])) return fail(409, "invalid_state", "Only a story under review can be updated.");
      const d = (input.confirmDistrict ?? "").trim();
      if (!d || d !== (row.declared_district ?? "")) return fail(422, "district_mismatch", "You can only confirm the district the author declared.");
      const geo = resolveSubmissionGeo({ headline: row.headline ?? "", summary: row.summary, body: row.body, location: row.location_text, declaredDistrict: row.declared_district, moderatorConfirmedDistrict: d });
      const u = await deps.repo.updateSubmission(id, { moderator_confirmed_district: d, geo: geo as unknown as SubmissionRow["geo"] }, row.status);
      if (!u) return fail(409, "conflict", "The story changed. Reload.");
      await record("confirm_district");
      await audit("user_news.district_confirmed", { district: d });
      return { ok: true, submission: u };
    }
    case "request_edit": {
      if (reason.length < 5) return fail(422, "reason_required", "Tell the author what to change.");
      if (!need(["under_review"])) return fail(409, "invalid_state", "Only a story under review can be sent back.");
      assertTransition("under_review", "ai_generated", "moderator");
      const u = await deps.repo.updateSubmission(id, { status: "ai_generated", reviewed_at: deps.now().toISOString() }, "under_review");
      if (!u) return fail(409, "conflict", "The story changed. Reload.");
      await record("request_edit");
      await audit("user_news.edit_requested", { reason });
      return { ok: true, submission: u };
    }
    case "reject":
    case "block": {
      if (reason.length < 5) return fail(422, "reason_required", "Write the reason; the author will see it.");
      const to: SubmissionStatus = input.decision === "reject" ? "rejected" : "blocked";
      if (!canTransition(row.status, to, "moderator")) return fail(409, "invalid_state", "This story cannot be moved there.");
      const u = await deps.repo.updateSubmission(id, { status: to, reviewed_at: deps.now().toISOString(), reviewer_id: moderatorId }, row.status);
      if (!u) return fail(409, "conflict", "The story changed. Reload.");
      await record(input.decision);
      await audit(`user_news.${to}`, { reason });
      return { ok: true, submission: u };
    }
    case "unpublish": {
      if (reason.length < 5) return fail(422, "reason_required", "Write the reason for the takedown.");
      if (row.status !== "published" || !row.published_article_id) return fail(409, "invalid_state", "Only a published story can be taken down.");
      await deps.repo.unpublishArticle(row.published_article_id);
      const u = await deps.repo.updateSubmission(id, { status: "blocked", reviewed_at: deps.now().toISOString(), reviewer_id: moderatorId }, "published");
      if (!u) return fail(409, "conflict", "The story changed. Reload.");
      await record("unpublish");
      await audit("user_news.takedown", { reason });
      deps.revalidateFeeds();
      return { ok: true, submission: u };
    }
    case "approve": {
      if (!need(["under_review"])) return fail(409, "invalid_state", "Only a story under review can be approved.");
      let current = row;
      if (input.edits) {
        const merged = { headline: input.edits.headline ?? current.headline, subheadline: input.edits.subheadline === undefined ? current.subheadline : input.edits.subheadline, summary: input.edits.summary ?? current.summary, body: input.edits.body ?? current.body };
        const geo = resolveSubmissionGeo({ headline: merged.headline ?? "", summary: merged.summary, body: merged.body, location: current.location_text, declaredDistrict: current.declared_district, moderatorConfirmedDistrict: current.moderator_confirmed_district });
        const flags = detectRiskFlags({ text: textOf(merged), headline: merged.headline ?? undefined });
        const e = await deps.repo.updateSubmission(id, { ...merged, geo: geo as unknown as SubmissionRow["geo"], risk_flags: flags, version: current.version + 1 }, current.status);
        if (!e) return fail(409, "conflict", "The story changed. Reload.");
        await deps.repo.insertRevision({ submission_id: id, version: e.version, kind: "moderator_edit", actor_id: moderatorId, snapshot: merged });
        current = e;
      }
      const problems = readinessProblems(current);
      if (problems.length) return fail(422, "not_publishable", problems[0]!, { problems });
      const reviewFlags = (current.risk_flags ?? []).filter((f) => f.severity === "review");
      if (reviewFlags.length && !input.acknowledgeFlags) {
        return fail(422, "flags_not_acknowledged", "This story carries review flags. Confirm that you have checked each one before approving.", { flags: reviewFlags.map((f) => f.code) });
      }
      assertTransition("under_review", "approved", "moderator");
      const approved = await deps.repo.updateSubmission(id, { status: "approved", reviewed_at: deps.now().toISOString(), reviewer_id: moderatorId }, "under_review");
      if (!approved) return fail(409, "conflict", "The story changed. Reload.");
      await record("approve");
      await audit("user_news.approved", { acknowledged: Boolean(input.acknowledgeFlags) });
      return publishSubmission(deps, approved, { moderatorId });
    }
  }
}

function readingTime(body: string, language: UserNewsLanguage): string {
  const words = body.split(/\s+/).filter(Boolean).length;
  const min = Math.max(1, Math.round(words / 200));
  return language === "hi" ? `${min} मिनट` : `${min} min read`;
}

/** Approved -> published. Idempotent: the article id IS the submission id, so a retry cannot create a second article. */
export async function publishSubmission(deps: Deps, row: SubmissionRow, by: { moderatorId: string }): Promise<Result<{ submission: SubmissionRow }>> {
  if (row.status !== "approved") return fail(409, "invalid_state", "Only an approved story can be published.");
  if (!row.headline || !row.summary || !row.body) return fail(422, "incomplete", "The story is incomplete.");

  const geo = resolveSubmissionGeo({ headline: row.headline, summary: row.summary, body: row.body, location: row.location_text, declaredDistrict: row.declared_district, moderatorConfirmedDistrict: row.moderator_confirmed_district });
  if (!geo.publishable) return fail(422, "geo_unknown", "The place of this story could not be established.");

  // Only a re-encoded derivative becomes public; the original stays private.
  const media = await deps.repo.listMedia(row.id);
  const hero = media.find((m) => m.kind === "image" && m.processing_status === "ready" && m.optimized_path);
  let heroUrl: string | null = null;
  if (hero?.optimized_path) {
    const bytes = await deps.storage.download(hero.optimized_path);
    heroUrl = await deps.storage.uploadPublic(`user-news/${row.id}.webp`, bytes, "image/webp");
  }

  const now = deps.now().toISOString();
  const authorName = (await deps.repo.getAuthorDisplayName(row.author_id)) ?? (row.language === "hi" ? "पाठक योगदानकर्ता" : "Reader contributor");
  const slug = optimizeSeoSlug(row.headline, row.id);
  await deps.repo.publishArticle({
    id: row.id,
    slug,
    headline: row.headline,
    summary: row.summary,
    article_body: row.body,
    hero_image_url: heroUrl,
    seo_title: row.headline.slice(0, 60),
    seo_description: row.summary.slice(0, 155),
    reading_time: readingTime(row.body, row.language),
    language: row.language,
    tags: row.tags ?? [],
    published_at: now,
    editorial_status: "approved",
    workflow_status: "published",
    reviewed_at: now,
    geo_metadata: toGeoMetadata(geo, deps.now()),
    editorial_metadata: {
      publish_decision: "publish",
      article_type: "user_report",
      user_news: { submission_id: row.id, author_id: row.author_id, contributor: authorName, ai_assisted: true, prompt_version: (row.ai_meta as { promptVersion?: string })?.promptVersion ?? null, moderated_by: by.moderatorId, moderated_at: now },
      source_attribution: [{ source: "Jan Darpan contributor", name: authorName }],
      rights: { media: heroUrl ? "contributor_supplied" : null },
    },
  });

  const published = await deps.repo.updateSubmission(row.id, { status: "published", published_at: now, published_article_id: row.id, geo: geo as unknown as SubmissionRow["geo"] }, "approved");
  if (!published) return fail(409, "conflict", "The story changed while publishing.");
  await deps.repo.audit({ actor_id: by.moderatorId, actor_kind: "moderator", action: "user_news.published", entity_type: "user_news_submission", entity_id: row.id, detail: { article_id: row.id, slug, scope: geo.scope, district: geo.districtSlug } });
  // The story enters the feeds through the same gate as every other story; only the caches need refreshing.
  deps.revalidateFeeds();
  return { ok: true, submission: published };
}

// ---------------------------------------------------------------------------------------------------------------------
// reading: My News and the moderation queue
// ---------------------------------------------------------------------------------------------------------------------

export type MyNewsItem = {
  id: string;
  status: SubmissionStatus;
  headline: string | null;
  language: UserNewsLanguage;
  district: string | null;
  createdAt: string;
  submittedAt: string | null;
  publishedAt: string | null;
  slug: string | null;
  thumbnailPath: string | null;
  moderationNote: { decision: string; reason: string | null } | null;
  stats: { viewsTotal: number; viewsToday: number; views7d: number; uniqueViewers: number; likes: number; comments: number; engagementRatePct: number | null } | null;
};

export async function listMyNews(deps: Deps, userId: string): Promise<Result<{ items: MyNewsItem[]; monetization: { active: false; message: string } }>> {
  const rows = await deps.repo.listSubmissionsByAuthor(userId);
  const stats = new Map((await deps.repo.myStats(userId)).map((s) => [String(s.submission_id), s]));
  const items: MyNewsItem[] = [];
  for (const r of rows) {
    const mods = await deps.repo.listModeration(r.id);
    const last = [...mods].reverse().find((m) => m.decision !== "hold" && m.decision !== "confirm_district");
    const media = await deps.repo.listMedia(r.id);
    const thumb = media.find((m) => m.kind === "image" && m.thumbnail_path)?.thumbnail_path ?? null;
    const s = stats.get(r.id);
    items.push({
      id: r.id,
      status: r.status,
      headline: r.headline,
      language: r.language,
      district: (r.geo as { districtSlug?: string | null })?.districtSlug ?? null,
      createdAt: r.created_at,
      submittedAt: r.submitted_at,
      publishedAt: r.published_at,
      slug: r.published_article_id && r.headline ? optimizeSeoSlug(r.headline, r.id) : null,
      thumbnailPath: thumb,
      moderationNote: last ? { decision: last.decision, reason: last.reason_text } : null,
      stats: s
        ? {
            viewsTotal: Number(s.views_total ?? 0),
            viewsToday: Number(s.views_today ?? 0),
            views7d: Number(s.views_7d ?? 0),
            uniqueViewers: Number(s.unique_viewers ?? 0),
            likes: Number(s.likes_total ?? 0),
            comments: Number(s.comments_total ?? 0),
            engagementRatePct: s.engagement_rate_pct === null || s.engagement_rate_pct === undefined ? null : Number(s.engagement_rate_pct),
          }
        : null,
    });
  }
  return { ok: true, items, monetization: { active: false, message: "Advertising revenue sharing not active" } };
}

export type ReviewBundle = {
  submission: SubmissionRow;
  revisions: RevisionRow[];
  moderation: ModerationRow[];
  media: Array<MediaRow & { previewUrl: string | null; originalUrl: string | null }>;
  author: { id: string; displayName: string | null; verification: { status: string; provider: string | null; verifiedAt: string | null } };
};

export async function getReviewBundle(deps: Deps, id: string): Promise<Result<{ bundle: ReviewBundle }>> {
  const submission = await deps.repo.getSubmission(id);
  if (!submission) return fail(404, "not_found", "That story was not found.");
  const [revisions, moderation, media, verification, displayName] = await Promise.all([
    deps.repo.listRevisions(id),
    deps.repo.listModeration(id),
    deps.repo.listMedia(id),
    deps.repo.getVerification(submission.author_id),
    deps.repo.getAuthorDisplayName(submission.author_id),
  ]);
  const withUrls = await Promise.all(
    media.map(async (m) => ({
      ...m,
      previewUrl: m.optimized_path ? await deps.storage.signedReadUrl(m.optimized_path, 900) : null,
      originalUrl: await deps.storage.signedReadUrl(m.storage_path, 900),
    }))
  );
  return {
    ok: true,
    bundle: {
      submission,
      revisions,
      moderation,
      media: withUrls,
      // Only the RESULT is shown to a moderator: never identity data (none is stored).
      author: { id: submission.author_id, displayName, verification: { status: effectiveStatus(verification, deps.now()), provider: verification?.provider ?? null, verifiedAt: verification?.verifiedAt ?? null } },
    },
  };
}

export async function listQueue(deps: Deps, statuses: SubmissionStatus[] = ["submitted", "under_review", "approved"]): Promise<SubmissionRow[]> {
  return deps.repo.listForModeration(statuses, 100);
}

// ---------------------------------------------------------------------------------------------------------------------
// author-facing reads
// ---------------------------------------------------------------------------------------------------------------------

export type OwnSubmissionView = {
  submission: Omit<SubmissionRow, "reviewer_id" | "moderator_confirmed_district">;
  media: Array<{ id: string; kind: string; status: string; width: number | null; height: number | null; durationMs: number | null; thumbnailUrl: string | null; problem: string | null }>;
  moderation: Array<{ decision: string; reason: string | null; at: string }>;
  readiness: { ready: boolean; problems: string[] };
};

/** The author's own story with everything the editor needs. Never includes the moderator's identity. */
export async function getOwnSubmission(deps: Deps, userId: string, id: string): Promise<Result<{ view: OwnSubmissionView }>> {
  const o = await loadOwned(deps, userId, id);
  if (!o.ok) return o;
  const { reviewer_id: _r, moderator_confirmed_district: _m, ...submission } = o.row;
  void _r;
  void _m;
  const [media, moderation] = await Promise.all([deps.repo.listMedia(id), deps.repo.listModeration(id)]);
  const problems = o.row.status === "ai_generated" || o.row.status === "user_approved" ? readinessProblems(o.row) : [];
  return {
    ok: true,
    view: {
      submission,
      media: await Promise.all(
        media.map(async (m) => ({
          id: m.id,
          kind: m.kind,
          status: m.processing_status,
          width: m.width,
          height: m.height,
          durationMs: m.duration_ms,
          thumbnailUrl: m.thumbnail_path ? await deps.storage.signedReadUrl(m.thumbnail_path, 900) : null,
          problem: m.processing_status === "rejected" ? String((m.validation as { message?: string })?.message ?? "This file was not accepted.") : null,
        }))
      ),
      moderation: moderation.filter((x) => x.decision !== "hold" && x.decision !== "confirm_district").map((x) => ({ decision: x.decision, reason: x.reason_text, at: x.created_at })),
      readiness: { ready: problems.length === 0, problems },
    },
  };
}

export type PostNewsStatus = {
  authenticated: boolean;
  allowed: boolean;
  reason: string | null;
  message: string | null;
  verification: { status: string; provider: string | null };
  verificationMode: "provider" | "manual_attestation" | "unavailable";
  features: { voice: boolean; video: boolean; monetizationActive: false };
  limits: { aiDraftsPerDay: number; submissionsPerDay: number; maxImages: number; maxVideoMb: number; maxVoiceSeconds: number };
};

export async function getPostNewsStatus(deps: Deps, userId: string | null): Promise<PostNewsStatus> {
  const record = userId ? (await deps.repo.getVerification(userId)) ?? NO_VERIFICATION : NO_VERIFICATION;
  const g = evaluatePostGate({ userId, record, env: deps.env, now: deps.now() });
  const availability = verificationAvailability(deps.env);
  const lim = limits(deps.env);
  return {
    authenticated: Boolean(userId),
    allowed: g.allowed,
    reason: g.allowed ? null : g.reason,
    message: g.allowed ? null : g.message,
    verification: { status: effectiveStatus(record, deps.now()), provider: record.provider },
    verificationMode: availability.available ? availability.mode : "unavailable",
    features: { voice: Boolean(deps.env.GOOGLE_TTS_SERVICE_ACCOUNT_JSON?.trim()), video: true, monetizationActive: false },
    limits: { aiDraftsPerDay: lim.aiDraftsPerDay, submissionsPerDay: lim.submissionsPerDay, maxImages: MEDIA_LIMITS.maxImages, maxVideoMb: Math.round(MEDIA_LIMITS.videoMaxBytes / 1024 / 1024), maxVoiceSeconds: Math.round(VOICE_LIMITS.maxDurationMs / 1000) },
  };
}
