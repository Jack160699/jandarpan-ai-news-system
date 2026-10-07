import { describe, expect, it } from "vitest";
import {
  approveByAuthor,
  createMediaSlot,
  createSubmission,
  editTranscript,
  finalizeMedia,
  generateDraft,
  getReviewBundle,
  listMyNews,
  moderate,
  publishSubmission,
  recordVerification,
  saveEdit,
  submitForModeration,
  transcribeVoice,
  updateSource,
  withdraw,
} from "@/lib/user-news/service";
import { MemoryRepo, makeDeps, verify } from "@/lib/user-news/testing/memory-deps";
import { img, jpegWithGps, mp4, textBytes, webmAudio } from "@/lib/user-news/testing/media-fixtures";
import { selectFeedRows } from "@/lib/feed/feed-selector";
import type { ChatFn } from "@/lib/user-news/ai-draft";
import type { Fail } from "@/lib/user-news/types";

const AUTHOR = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const MOD = "33333333-3333-4333-8333-333333333333";

const SOURCE = "आज सुबह रायपुर के शंकर नगर चौक पर दो बाइक की टक्कर हो गई। तीन लोग घायल हुए। लोग उन्हें अस्पताल ले गए।";
const goodDraft = {
  headline: "रायपुर के शंकर नगर चौक पर दो बाइक की टक्कर, तीन घायल",
  subheadline: "घायलों को अस्पताल ले जाया गया",
  summary: "रायपुर के शंकर नगर चौक पर आज सुबह दो बाइक आपस में टकरा गईं, जिसमें तीन लोग घायल हुए।",
  body: "रायपुर के शंकर नगर चौक पर आज सुबह दो बाइक की टक्कर हो गई। हादसे में तीन लोग घायल हुए हैं।\n\nघायलों को लोग अस्पताल ले गए। यह जानकारी योगदानकर्ता द्वारा दी गई है।",
  location: "शंकर नगर चौक, रायपुर",
  district_suggestion: "raipur",
  category: "accident",
  tags: ["raipur", "accident"],
  insufficient_evidence: false,
  missing_information: [],
};
const chatReturning = (obj: unknown): ChatFn => async () => ({ ok: true, content: JSON.stringify(obj), provider: "groq" as never, model: "llama-3.3-70b-versatile", latencyMs: 500 });

function setup(opts: { verified?: boolean; chat?: ChatFn; env?: Record<string, string | undefined> } = {}) {
  const ctx = makeDeps({ chat: opts.chat ?? chatReturning(goodDraft), env: opts.env });
  if (opts.verified !== false) verify(ctx.repo, AUTHOR);
  return ctx;
}

async function toAiDraft(ctx: ReturnType<typeof setup>) {
  const created = await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: SOURCE, declaredDistrict: "raipur" });
  if (!created.ok) throw new Error(`create failed: ${created.code}`);
  const drafted = await generateDraft(ctx.deps, AUTHOR, created.submission.id);
  if (!drafted.ok) throw new Error(`draft failed: ${drafted.code}`);
  return drafted.submission;
}

async function toSubmitted(ctx: ReturnType<typeof setup>) {
  const draft = await toAiDraft(ctx);
  const approved = await approveByAuthor(ctx.deps, AUTHOR, draft.id);
  if (!approved.ok) throw new Error(`approve failed: ${approved.code} ${approved.message}`);
  const submitted = await submitForModeration(ctx.deps, AUTHOR, draft.id);
  if (!submitted.ok) throw new Error(`submit failed: ${submitted.code}`);
  return submitted.submission;
}

const code = (r: { ok: boolean }) => (r.ok ? "ok" : (r as Fail).code);
const status = (r: { ok: boolean }) => (r.ok ? 200 : (r as Fail).status);

describe("the verification gate stops every write", () => {
  it("with no provider configured, an unverified user is told verification is unavailable (nothing is faked)", async () => {
    const ctx = setup({ verified: false, env: {} });
    const r = await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: SOURCE });
    expect(code(r)).toBe("verification_unavailable");
    expect((r as Fail).message).toBe("Identity verification unavailable until verification service is configured.");
    expect(ctx.repo.submissions.size).toBe(0);
  });

  it("with a provider configured, an unverified user is asked to verify", async () => {
    const ctx = setup({ verified: false, env: { IDENTITY_VERIFICATION_PROVIDER: "acme", IDENTITY_PROVIDER_WEBHOOK_SECRET: "s" } });
    const r = await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: SOURCE });
    expect(code(r)).toBe("not_verified");
    expect(status(r)).toBe(403);
  });

  it("pending, rejected, revoked and expired verifications do not open the gate", async () => {
    for (const status of ["pending", "rejected", "revoked", "expired"] as const) {
      const ctx = setup({ verified: false });
      verify(ctx.repo, AUTHOR, { status });
      expect(status === "pending" || code(await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: SOURCE })) !== "ok").toBe(true);
      expect(code(await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: SOURCE }))).not.toBe("ok");
    }
  });

  it("an expired verification (stored as verified, past its expiry) is blocked", async () => {
    const ctx = setup({ verified: false });
    verify(ctx.repo, AUTHOR, { expiresAt: "2026-10-01T00:00:00.000Z" });
    expect(code(await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: SOURCE }))).not.toBe("ok");
  });

  it("the feature can be switched off entirely", async () => {
    const ctx = setup({ env: { USER_NEWS_ENABLED: "false", IDENTITY_MANUAL_ATTESTATION_ENABLED: "true" } });
    expect(code(await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: SOURCE }))).toBe("feature_disabled");
  });

  it("every write function refuses an unverified user", async () => {
    const ctx = setup({ verified: false });
    const s = await ctx.repo.insertSubmission({ author_id: AUTHOR, language: "hi", input_kind: "text", raw_text: SOURCE, transcript: null, location_text: null, declared_district: null });
    const media = await ctx.repo.insertMedia({ submission_id: s.id, owner_id: AUTHOR, kind: "image", storage_path: "p", original_mime: "image/png", size_bytes: 10 });
    const results = [
      await updateSource(ctx.deps, AUTHOR, s.id, { text: "x" }),
      await generateDraft(ctx.deps, AUTHOR, s.id),
      await saveEdit(ctx.deps, AUTHOR, s.id, { headline: "x" }),
      await editTranscript(ctx.deps, AUTHOR, s.id, "x"),
      await approveByAuthor(ctx.deps, AUTHOR, s.id),
      await submitForModeration(ctx.deps, AUTHOR, s.id),
      await createMediaSlot(ctx.deps, AUTHOR, s.id, { kind: "image", mime: "image/png", sizeBytes: 10 }),
      await finalizeMedia(ctx.deps, AUTHOR, media.id),
      await transcribeVoice(ctx.deps, AUTHOR, s.id, media.id),
    ];
    for (const r of results) expect(r.ok).toBe(false);
    expect(results.every((r) => ["verification_unavailable", "not_verified"].includes((r as Fail).code))).toBe(true);
  });

  it("an unverified user can still withdraw their own story", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    ctx.repo.verification.delete(AUTHOR);
    expect(code(await withdraw(ctx.deps, AUTHOR, draft.id))).toBe("ok");
  });
});

describe("ownership: a stranger's story looks like a missing one", () => {
  it("every operation by another user returns 404, never 403, and changes nothing", async () => {
    const ctx = setup();
    verify(ctx.repo, OTHER);
    const draft = await toAiDraft(ctx);
    const before = JSON.stringify(ctx.repo.submissions.get(draft.id));
    const results = [
      await updateSource(ctx.deps, OTHER, draft.id, { text: "hijack" }),
      await generateDraft(ctx.deps, OTHER, draft.id),
      await saveEdit(ctx.deps, OTHER, draft.id, { headline: "hijack" }),
      await approveByAuthor(ctx.deps, OTHER, draft.id),
      await submitForModeration(ctx.deps, OTHER, draft.id),
      await withdraw(ctx.deps, OTHER, draft.id),
      await createMediaSlot(ctx.deps, OTHER, draft.id, { kind: "image", mime: "image/png", sizeBytes: 10 }),
    ];
    for (const r of results) {
      expect(status(r)).toBe(404);
      expect(code(r)).toBe("not_found");
    }
    expect(JSON.stringify(ctx.repo.submissions.get(draft.id))).toBe(before);
  });

  it("My News lists only the caller's stories", async () => {
    const ctx = setup();
    verify(ctx.repo, OTHER);
    await toAiDraft(ctx);
    const theirs = await listMyNews(ctx.deps, OTHER);
    expect(theirs.ok && theirs.items).toEqual([]);
    const mine = await listMyNews(ctx.deps, AUTHOR);
    expect(mine.ok && mine.items).toHaveLength(1);
  });
});

describe("limits", () => {
  it("caps new stories per day", async () => {
    const ctx = setup({ env: { IDENTITY_MANUAL_ATTESTATION_ENABLED: "true", USER_NEWS_SUBMISSIONS_PER_DAY: "2" } });
    expect(code(await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: SOURCE }))).toBe("ok");
    expect(code(await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: SOURCE }))).toBe("ok");
    const third = await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: SOURCE });
    expect(code(third)).toBe("daily_limit");
    expect(status(third)).toBe(429);
  });

  it("caps AI drafts per day", async () => {
    const ctx = setup({ env: { IDENTITY_MANUAL_ATTESTATION_ENABLED: "true", USER_NEWS_AI_DRAFTS_PER_DAY: "1" } });
    const created = await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: SOURCE });
    if (!created.ok) throw new Error("create");
    expect(code(await generateDraft(ctx.deps, AUTHOR, created.submission.id))).toBe("ok");
    const second = await generateDraft(ctx.deps, AUTHOR, created.submission.id);
    expect(code(second)).toBe("ai_daily_limit");
    expect(status(second)).toBe(429);
  });

  it("rejects an over-long report without creating anything", async () => {
    const ctx = setup();
    expect(code(await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: "क".repeat(7000) }))).toBe("source_too_long");
    expect(ctx.repo.submissions.size).toBe(0);
  });
});

describe("authoring flow: text -> AI draft -> edit -> approve -> submit", () => {
  it("the AI draft is a DRAFT: status ai_generated, nothing public, nothing submitted", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    expect(draft.status).toBe("ai_generated");
    expect(draft.user_approved_at).toBeNull();
    expect(draft.submitted_at).toBeNull();
    expect(ctx.repo.articles.size).toBe(0);
    expect(draft.geo.districtSlug).toBe("raipur");
    expect(draft.ai_meta).toMatchObject({ provider: "groq", promptVersion: "user-news-draft-v1" });
  });

  it("cannot edit before an AI draft exists, and cannot generate once approved", async () => {
    const ctx = setup();
    const created = await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: SOURCE });
    if (!created.ok) throw new Error("create");
    expect(code(await saveEdit(ctx.deps, AUTHOR, created.submission.id, { headline: "x" }))).toBe("no_draft");
    const drafted = await generateDraft(ctx.deps, AUTHOR, created.submission.id);
    if (!drafted.ok) throw new Error("draft");
    await approveByAuthor(ctx.deps, AUTHOR, drafted.submission.id);
    expect(code(await generateDraft(ctx.deps, AUTHOR, drafted.submission.id))).toBe("not_editable");
  });

  it("the author must approve explicitly: submitting an unapproved draft is refused and nothing moves", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    expect(code(await submitForModeration(ctx.deps, AUTHOR, draft.id))).toBe("approval_required");
    expect(ctx.repo.submissions.get(draft.id)!.status).toBe("ai_generated");
  });

  it("approving then submitting moves through user_approved to submitted and records both timestamps", async () => {
    const ctx = setup();
    const submitted = await toSubmitted(ctx);
    expect(submitted.status).toBe("submitted");
    expect(submitted.user_approved_at).toBe("2026-10-07T12:00:00.000Z");
    expect(submitted.submitted_at).toBe("2026-10-07T12:00:00.000Z");
    expect(ctx.repo.audits.map((a) => a.action)).toEqual(expect.arrayContaining(["user_news.created", "user_news.ai_draft", "user_news.user_approved", "user_news.submitted"]));
  });

  it("editing an approved story takes it back to 'AI draft ready': the author must approve the new text again", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    await approveByAuthor(ctx.deps, AUTHOR, draft.id);
    const edited = await saveEdit(ctx.deps, AUTHOR, draft.id, { body: `${draft.body}\n\nघटनास्थल पर भीड़ जमा हो गई थी।` });
    expect(edited.ok && edited.submission.status).toBe("ai_generated");
    expect(edited.ok && edited.submission.user_approved_at).toBeNull();
    expect(code(await submitForModeration(ctx.deps, AUTHOR, draft.id))).toBe("approval_required");
  });

  it("each text version is kept in an append-only history", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    await saveEdit(ctx.deps, AUTHOR, draft.id, { headline: "रायपुर के शंकर नगर चौक पर दो बाइक की भिड़ंत, तीन घायल" });
    expect(ctx.repo.revisions.map((r) => r.kind)).toEqual(["source", "ai_draft", "user_edit"]);
  });

  it("once submitted the author can no longer edit", async () => {
    const ctx = setup();
    const s = await toSubmitted(ctx);
    expect(code(await saveEdit(ctx.deps, AUTHOR, s.id, { headline: "बदला हुआ शीर्षक जो अब नहीं बदलना चाहिए" }))).toBe("not_editable");
    expect(code(await updateSource(ctx.deps, AUTHOR, s.id, { text: "new" }))).toBe("not_editable");
  });
});

describe("readiness: nothing unsafe can be approved or submitted", () => {
  it("blocks approval while the AI's invented facts are still in the text", async () => {
    const invented = { ...goodDraft, body: goodDraft.body.replace("तीन लोग", "सात लोग"), summary: goodDraft.summary.replace("तीन", "सात") };
    const ctx = setup({ chat: chatReturning(invented) });
    const draft = await toAiDraft(ctx);
    expect(draft.fact_flags.some((f) => f.severity === "block")).toBe(true);
    const r = await approveByAuthor(ctx.deps, AUTHOR, draft.id);
    expect(code(r)).toBe("not_ready");
    expect(status(r)).toBe(422);
  });

  it("lets the author fix it, and then approve", async () => {
    const invented = { ...goodDraft, body: goodDraft.body.replace("तीन लोग", "सात लोग"), summary: goodDraft.summary.replace("तीन", "सात") };
    const ctx = setup({ chat: chatReturning(invented) });
    const draft = await toAiDraft(ctx);
    const fixed = await saveEdit(ctx.deps, AUTHOR, draft.id, { body: goodDraft.body, summary: goodDraft.summary });
    expect(fixed.ok && fixed.submission.fact_flags.filter((f) => f.severity === "block")).toEqual([]);
    expect(code(await approveByAuthor(ctx.deps, AUTHOR, draft.id))).toBe("ok");
  });

  it("does not hold the author to the source for facts they add themselves", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    const edited = await saveEdit(ctx.deps, AUTHOR, draft.id, { body: `${draft.body}\n\nइस चौक पर इस साल 12 हादसे हो चुके हैं।` });
    expect(edited.ok && edited.submission.fact_flags.filter((f) => f.severity === "block")).toEqual([]);
  });

  it("blocks approval when the story contains a phone number", async () => {
    const ctx = setup({ chat: chatReturning({ ...goodDraft, body: `${goodDraft.body}\n\nसंपर्क: 9876543210।` }) });
    const created = await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: `${SOURCE} संपर्क: 9876543210।` });
    if (!created.ok) throw new Error("create");
    const drafted = await generateDraft(ctx.deps, AUTHOR, created.submission.id);
    if (!drafted.ok) throw new Error("draft");
    expect(drafted.riskFlags.some((f) => f.code === "personal_data_exposure")).toBe(true);
    expect(code(await approveByAuthor(ctx.deps, AUTHOR, created.submission.id))).toBe("not_ready");
  });

  it("blocks approval when the place cannot be established (UNKNOWN geography)", async () => {
    const noPlace = { ...goodDraft, headline: "चौक पर दो बाइक की टक्कर, तीन लोग घायल हुए", summary: "आज सुबह चौक पर दो बाइक की टक्कर में तीन लोग घायल हुए, ऐसा योगदानकर्ता ने बताया।", body: "आज सुबह चौक पर दो बाइक की टक्कर हो गई। तीन लोग घायल हुए। लोग उन्हें अस्पताल ले गए।", location: "", district_suggestion: null };
    const ctx = setup({ chat: chatReturning(noPlace) });
    const created = await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: "आज सुबह चौक पर दो बाइक की टक्कर हो गई। तीन लोग घायल हुए। लोग उन्हें अस्पताल ले गए।" });
    if (!created.ok) throw new Error("create");
    const drafted = await generateDraft(ctx.deps, AUTHOR, created.submission.id);
    if (!drafted.ok) throw new Error("draft");
    const r = await approveByAuthor(ctx.deps, AUTHOR, created.submission.id);
    expect(code(r)).toBe("not_ready");
    expect((r as Fail).message).toMatch(/where this happened/);
  });
});

describe("moderation: only a moderator decides, and publishing needs an explicit decision", () => {
  it("a moderator cannot moderate their own story", async () => {
    const ctx = setup();
    const s = await toSubmitted(ctx);
    expect(code(await moderate(ctx.deps, AUTHOR, s.id, { decision: "approve", acknowledgeFlags: true }))).toBe("own_story");
  });

  it("approve publishes ONE article through the normal pipeline fields, links it, audits it and refreshes the feeds", async () => {
    const ctx = setup();
    ctx.repo.names.set(AUTHOR, "रमेश");
    const s = await toSubmitted(ctx);
    const r = await moderate(ctx.deps, MOD, s.id, { decision: "approve", acknowledgeFlags: true });
    expect(r.ok && r.submission.status).toBe("published");
    expect(ctx.repo.articles.size).toBe(1);
    const article = ctx.repo.articles.get(s.id)!;
    expect(article).toMatchObject({ id: s.id, language: "hi", editorial_status: "approved", workflow_status: "published" });
    expect(article.slug).toMatch(/-[a-f0-9]{8}$/);
    expect(article.geo_metadata).toMatchObject({ scope: "DISTRICT_SPECIFIC", primary_district: "raipur" });
    expect(article.editorial_metadata).toMatchObject({ user_news: { submission_id: s.id, author_id: AUTHOR, contributor: "रमेश", ai_assisted: true, moderated_by: MOD } });
    expect(ctx.repo.submissions.get(s.id)).toMatchObject({ status: "published", published_article_id: s.id });
    expect(ctx.revalidate.calls).toBe(1);
    expect(ctx.repo.audits.map((a) => a.action)).toEqual(expect.arrayContaining(["user_news.approved", "user_news.published"]));
    expect(ctx.repo.moderation.map((m) => m.decision)).toEqual(["approve"]);
  });

  it("the published story appears in the correct district feed and nowhere it should not", async () => {
    const ctx = setup();
    const s = await toSubmitted(ctx);
    await moderate(ctx.deps, MOD, s.id, { decision: "approve", acknowledgeFlags: true });
    const a = ctx.repo.articles.get(s.id)!;
    const row = { id: a.id, slug: a.slug, headline: a.headline, published_at: a.published_at, editorial_status: a.editorial_status, workflow_status: a.workflow_status, geo_metadata: a.geo_metadata };
    const now = new Date("2026-10-07T13:00:00.000Z");
    expect(selectFeedRows([row], { feed: "district", districtSlug: "raipur", now }).rows).toHaveLength(1);
    expect(selectFeedRows([row], { feed: "district", districtSlug: "durg", now }).rows).toHaveLength(0);
    expect(selectFeedRows([row], { feed: "cg_home", order: "chronological", now }).rows).toHaveLength(1);
  });

  it("publishing is idempotent: a second attempt creates no second article", async () => {
    const ctx = setup();
    const s = await toSubmitted(ctx);
    await moderate(ctx.deps, MOD, s.id, { decision: "approve", acknowledgeFlags: true });
    const published = ctx.repo.submissions.get(s.id)!;
    expect(code(await publishSubmission(ctx.deps, published, { moderatorId: MOD }))).toBe("invalid_state");
    expect(ctx.repo.articles.size).toBe(1);
  });

  it("a story that carries review flags cannot be approved until the moderator acknowledges them", async () => {
    const withUnverifiable = { ...goodDraft, body: `${goodDraft.body}\n\nएक वायरल मैसेज में कहा जा रहा है कि चौक पर और हादसे होंगे।` };
    const ctx = setup({ chat: chatReturning(withUnverifiable) });
    const created = await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: `${SOURCE} एक वायरल मैसेज में कहा जा रहा है कि चौक पर और हादसे होंगे।`, declaredDistrict: "raipur" });
    if (!created.ok) throw new Error("create");
    await generateDraft(ctx.deps, AUTHOR, created.submission.id);
    await approveByAuthor(ctx.deps, AUTHOR, created.submission.id);
    await submitForModeration(ctx.deps, AUTHOR, created.submission.id);
    const refused = await moderate(ctx.deps, MOD, created.submission.id, { decision: "approve" });
    expect(code(refused)).toBe("flags_not_acknowledged");
    expect(ctx.repo.articles.size).toBe(0);
    const accepted = await moderate(ctx.deps, MOD, created.submission.id, { decision: "approve", acknowledgeFlags: true });
    expect(accepted.ok && accepted.submission.status).toBe("published");
  });

  it("reject needs a written reason, is terminal, and the author sees the reason but not who decided", async () => {
    const ctx = setup();
    const s = await toSubmitted(ctx);
    expect(code(await moderate(ctx.deps, MOD, s.id, { decision: "reject" }))).toBe("reason_required");
    const rejected = await moderate(ctx.deps, MOD, s.id, { decision: "reject", reasonText: "यह खबर हमारे मानकों पर खरी नहीं उतरती।" });
    expect(rejected.ok && rejected.submission.status).toBe("rejected");
    expect(ctx.repo.articles.size).toBe(0);
    expect(code(await approveByAuthor(ctx.deps, AUTHOR, s.id))).toBe("invalid_state");
    const mine = await listMyNews(ctx.deps, AUTHOR);
    expect(mine.ok && mine.items[0]!.moderationNote).toEqual({ decision: "reject", reason: "यह खबर हमारे मानकों पर खरी नहीं उतरती।" });
    expect(JSON.stringify(mine)).not.toContain(MOD);
  });

  it("request-edit sends the story back; the author must fix and approve again before it can return", async () => {
    const ctx = setup();
    const s = await toSubmitted(ctx);
    const r = await moderate(ctx.deps, MOD, s.id, { decision: "request_edit", reasonText: "कृपया घटना का समय स्पष्ट करें।" });
    expect(r.ok && r.submission.status).toBe("ai_generated");
    expect(r.ok && r.submission.user_approved_at).toBeNull();
    expect(code(await submitForModeration(ctx.deps, AUTHOR, s.id))).toBe("approval_required");
    expect(code(await approveByAuthor(ctx.deps, AUTHOR, s.id))).toBe("ok");
    expect(code(await submitForModeration(ctx.deps, AUTHOR, s.id))).toBe("ok");
  });

  it("hold keeps the story under review", async () => {
    const ctx = setup();
    const s = await toSubmitted(ctx);
    const r = await moderate(ctx.deps, MOD, s.id, { decision: "hold", reasonText: "जांच जारी है" });
    expect(r.ok && r.submission.status).toBe("under_review");
  });

  it("a moderator's edits are kept as their own revision and the flags are recomputed before publishing", async () => {
    const ctx = setup();
    const s = await toSubmitted(ctx);
    await moderate(ctx.deps, MOD, s.id, { decision: "approve", acknowledgeFlags: true, edits: { summary: "रायपुर के शंकर नगर चौक पर आज सुबह दो बाइक की टक्कर में तीन लोग घायल हुए।" } });
    expect(ctx.repo.revisions.map((r) => r.kind)).toContain("moderator_edit");
    expect(ctx.repo.articles.get(s.id)!.summary).toContain("तीन लोग घायल");
  });

  it("a moderator edit that adds personal data is caught before publishing", async () => {
    const ctx = setup();
    const s = await toSubmitted(ctx);
    const r = await moderate(ctx.deps, MOD, s.id, { decision: "approve", acknowledgeFlags: true, edits: { body: `${goodDraft.body}\n\nफोन: 9876543210` } });
    expect(code(r)).toBe("not_publishable");
    expect(ctx.repo.articles.size).toBe(0);
  });

  it("a declared district only reaches district pages once a moderator confirms it", async () => {
    const noPlaceDraft = { ...goodDraft, headline: "चौक पर दो बाइक की टक्कर, तीन लोग घायल हुए", summary: "आज सुबह चौक पर दो बाइक की टक्कर में तीन लोग घायल हुए, ऐसा योगदानकर्ता ने बताया।", body: "आज सुबह चौक पर दो बाइक की टक्कर हो गई। तीन लोग घायल हुए। लोग उन्हें अस्पताल ले गए।", location: "", district_suggestion: "korba" };
    const ctx = setup({ chat: chatReturning(noPlaceDraft) });
    const created = await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: "आज सुबह चौक पर दो बाइक की टक्कर हो गई। तीन लोग घायल हुए। लोग उन्हें अस्पताल ले गए।", declaredDistrict: "korba" });
    if (!created.ok) throw new Error("create");
    await generateDraft(ctx.deps, AUTHOR, created.submission.id);
    // the author cannot approve while geography is unknown
    expect(code(await approveByAuthor(ctx.deps, AUTHOR, created.submission.id))).toBe("not_ready");
    // add place evidence in the author's own words, then approve and submit
    await saveEdit(ctx.deps, AUTHOR, created.submission.id, { body: `${noPlaceDraft.body}\n\nयह घटना कोरबा शहर में हुई।`, summary: "कोरबा में आज सुबह चौक पर दो बाइक की टक्कर में तीन लोग घायल हुए।", headline: "कोरबा में चौक पर दो बाइक की टक्कर, तीन लोग घायल" });
    expect(code(await approveByAuthor(ctx.deps, AUTHOR, created.submission.id))).toBe("ok");
    expect(code(await submitForModeration(ctx.deps, AUTHOR, created.submission.id))).toBe("ok");
    const done = await moderate(ctx.deps, MOD, created.submission.id, { decision: "approve", acknowledgeFlags: true });
    expect(done.ok && done.submission.status).toBe("published");
    expect(ctx.repo.articles.get(created.submission.id)!.geo_metadata).toMatchObject({ scope: "DISTRICT_SPECIFIC", primary_district: "korba" });
  });
});

describe("withdrawal and takedown", () => {
  it("the author withdrawing a published story takes the article down and refreshes the feeds", async () => {
    const ctx = setup();
    const s = await toSubmitted(ctx);
    await moderate(ctx.deps, MOD, s.id, { decision: "approve", acknowledgeFlags: true });
    ctx.revalidate.calls = 0;
    const r = await withdraw(ctx.deps, AUTHOR, s.id);
    expect(r.ok && r.submission.status).toBe("withdrawn");
    expect(ctx.repo.articles.get(s.id)!.archived).toBe(true);
    expect(ctx.revalidate.calls).toBe(1);
  });

  it("a moderator takedown needs a reason, blocks the story and refreshes the feeds", async () => {
    const ctx = setup();
    const s = await toSubmitted(ctx);
    await moderate(ctx.deps, MOD, s.id, { decision: "approve", acknowledgeFlags: true });
    expect(code(await moderate(ctx.deps, MOD, s.id, { decision: "unpublish" }))).toBe("reason_required");
    const r = await moderate(ctx.deps, MOD, s.id, { decision: "unpublish", reasonText: "सत्यापन में गलत तथ्य मिले।" });
    expect(r.ok && r.submission.status).toBe("blocked");
    expect(ctx.repo.articles.get(s.id)!.archived).toBe(true);
  });
});

describe("media", () => {
  const slot = async (ctx: ReturnType<typeof setup>, subId: string, kind: "image" | "video" | "voice", mime: string, size: number) => createMediaSlot(ctx.deps, AUTHOR, subId, { kind, mime, sizeBytes: size });

  it("issues a server-chosen path under the author's folder, whatever the client calls the file", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    const r = await slot(ctx, draft.id, "image", "image/jpeg", 200_000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.upload.path).toMatch(new RegExp(`^${AUTHOR}/${draft.id}/[0-9a-f-]{36}\\.jpg$`));
    expect(ctx.storage.signedUploads).toEqual([r.upload.path]);
  });

  it("refuses unsupported types, oversize files and too many files before issuing any upload URL", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    expect(code(await slot(ctx, draft.id, "image", "image/svg+xml", 1000))).toBe("unsupported_type");
    expect(code(await slot(ctx, draft.id, "image", "text/html", 1000))).toBe("unsupported_type");
    expect(code(await slot(ctx, draft.id, "image", "image/png", 11 * 1024 * 1024))).toBe("too_large");
    expect(code(await slot(ctx, draft.id, "video", "video/mp4", 101 * 1024 * 1024))).toBe("too_large");
    expect(code(await slot(ctx, draft.id, "voice", "audio/webm", 11 * 1024 * 1024))).toBe("too_large");
    expect(code(await slot(ctx, draft.id, "image", "image/png", 0))).toBe("too_large");
    expect(ctx.storage.signedUploads).toHaveLength(0);
    for (let i = 0; i < 6; i++) expect(code(await slot(ctx, draft.id, "image", "image/png", 1000))).toBe("ok");
    expect(code(await slot(ctx, draft.id, "image", "image/png", 1000))).toBe("too_many");
    expect(code(await slot(ctx, draft.id, "video", "video/mp4", 1000))).toBe("ok");
    expect(code(await slot(ctx, draft.id, "video", "video/mp4", 1000))).toBe("too_many");
  });

  it("no media can be added once the story is submitted", async () => {
    const ctx = setup();
    const s = await toSubmitted(ctx);
    expect(code(await slot(ctx, s.id, "image", "image/png", 1000))).toBe("not_editable");
  });

  it("a good landscape photo is re-encoded, EXIF/GPS is stripped, derivatives are stored, and the media is ready", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    const r = await slot(ctx, draft.id, "image", "image/jpeg", 1);
    if (!r.ok) throw new Error("slot");
    const original = await jpegWithGps(1600, 900);
    ctx.storage.put(r.upload.path, original, "image/jpeg");
    const done = await finalizeMedia(ctx.deps, AUTHOR, r.mediaId);
    expect(done.ok && done.media.processing_status).toBe("ready");
    if (!done.ok) return;
    expect(done.media).toMatchObject({ width: 1600, height: 900 });
    const optimized = ctx.storage.private.get(done.media.optimized_path!)!;
    expect(optimized.mime).toBe("image/webp");
    expect(Buffer.from(optimized.bytes).includes(Buffer.from("secret-author-name"))).toBe(false);
    expect(ctx.storage.private.has(done.media.thumbnail_path!)).toBe(true);
    expect(done.media.size_bytes).toBe(original.length); // size comes from storage, not the client's claim of "1"
  });

  it("rejects portrait photos, tiny photos, renamed scripts and SVG disguised as JPEG", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    const cases: Array<[string, Uint8Array, string]> = [
      ["portrait", await img("jpeg", 900, 1600), "not_landscape"],
      ["tiny", await img("jpeg", 400, 225), "too_small"],
      ["a script renamed .jpg", textBytes("<script>alert(1)</script>"), "unsupported_type"],
      ["SVG renamed .jpg", textBytes("<svg xmlns='http://www.w3.org/2000/svg'><script>x</script></svg>"), "unsupported_type"],
      ["a PNG declared as JPEG", await img("png", 1600, 900), "mime_mismatch"],
    ];
    for (const [, bytes, expected] of cases) {
      const r = await slot(ctx, draft.id, "image", "image/jpeg", 1);
      if (!r.ok) throw new Error("slot");
      // free a slot so the 6-image cap is not what rejects the next case
      ctx.storage.put(r.upload.path, bytes);
      const done = await finalizeMedia(ctx.deps, AUTHOR, r.mediaId);
      expect(code(done)).toBe(expected);
      expect((await ctx.repo.getMedia(r.mediaId))!.processing_status).toBe("rejected");
    }
  });

  it("a story with a rejected media item cannot be submitted until the author deals with it", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    const r = await slot(ctx, draft.id, "image", "image/jpeg", 1);
    if (!r.ok) throw new Error("slot");
    ctx.storage.put(r.upload.path, await img("jpeg", 900, 1600));
    await finalizeMedia(ctx.deps, AUTHOR, r.mediaId);
    await approveByAuthor(ctx.deps, AUTHOR, draft.id);
    expect(code(await submitForModeration(ctx.deps, AUTHOR, draft.id))).toBe("media_problem");
  });

  it("an upload that never arrived is reported, not silently accepted", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    const r = await slot(ctx, draft.id, "image", "image/png", 1000);
    if (!r.ok) throw new Error("slot");
    expect(code(await finalizeMedia(ctx.deps, AUTHOR, r.mediaId))).toBe("not_uploaded");
  });

  it("someone else cannot finalize the author's media", async () => {
    const ctx = setup();
    verify(ctx.repo, OTHER);
    const draft = await toAiDraft(ctx);
    const r = await slot(ctx, draft.id, "image", "image/png", 1000);
    if (!r.ok) throw new Error("slot");
    expect(code(await finalizeMedia(ctx.deps, OTHER, r.mediaId))).toBe("not_found");
  });

  it("videos: a valid landscape MP4 is ready; the index at the END of a large file is still found", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    const a = await slot(ctx, draft.id, "video", "video/mp4", 1);
    if (!a.ok) throw new Error("slot");
    ctx.storage.put(a.upload.path, mp4({ durationMs: 45_000, width: 1920, height: 1080 }));
    const ready = await finalizeMedia(ctx.deps, AUTHOR, a.mediaId);
    expect(ready.ok && ready.media).toMatchObject({ processing_status: "ready", width: 1920, height: 1080, duration_ms: 45_000 });

    const ctx2 = setup();
    const d2 = await toAiDraft(ctx2);
    const b = await slot(ctx2, d2.id, "video", "video/mp4", 1);
    if (!b.ok) throw new Error("slot");
    ctx2.storage.put(b.upload.path, mp4({ durationMs: 30_000, width: 1280, height: 720, moovFirst: false, padding: 6 * 1024 * 1024 }));
    const tail = await finalizeMedia(ctx2.deps, AUTHOR, b.mediaId);
    expect(tail.ok && tail.media).toMatchObject({ processing_status: "ready", width: 1280, height: 720, duration_ms: 30_000 });
  });

  it("videos: rejects portrait, too long, and never claims 'ready' when it cannot read the container", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    const portrait = await slot(ctx, draft.id, "video", "video/mp4", 1);
    if (!portrait.ok) throw new Error("slot");
    ctx.storage.put(portrait.upload.path, mp4({ durationMs: 10_000, width: 720, height: 1280 }));
    expect(code(await finalizeMedia(ctx.deps, AUTHOR, portrait.mediaId))).toBe("not_landscape");

    const ctx2 = setup();
    const d2 = await toAiDraft(ctx2);
    const long = await slot(ctx2, d2.id, "video", "video/mp4", 1);
    if (!long.ok) throw new Error("slot");
    ctx2.storage.put(long.upload.path, mp4({ durationMs: 200_000, width: 1920, height: 1080 }));
    expect(code(await finalizeMedia(ctx2.deps, AUTHOR, long.mediaId))).toBe("too_long");

    const ctx3 = setup();
    const d3 = await toAiDraft(ctx3);
    const webm = await slot(ctx3, d3.id, "video", "video/webm", 1);
    if (!webm.ok) throw new Error("slot");
    ctx3.storage.put(webm.upload.path, new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ...new Array(500).fill(1)]));
    const pending = await finalizeMedia(ctx3.deps, AUTHOR, webm.mediaId);
    expect(pending.ok && pending.media.processing_status).toBe("pending");
    expect(pending.ok && pending.media.validation).toMatchObject({ needsProbe: true });
  });

  it("publishing exposes ONLY the re-encoded derivative: the original never becomes public", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    const r = await slot(ctx, draft.id, "image", "image/jpeg", 1);
    if (!r.ok) throw new Error("slot");
    ctx.storage.put(r.upload.path, await jpegWithGps(1600, 900));
    await finalizeMedia(ctx.deps, AUTHOR, r.mediaId);
    await approveByAuthor(ctx.deps, AUTHOR, draft.id);
    await submitForModeration(ctx.deps, AUTHOR, draft.id);
    await moderate(ctx.deps, MOD, draft.id, { decision: "approve", acknowledgeFlags: true });
    const article = ctx.repo.articles.get(draft.id)!;
    expect(article.hero_image_url).toBe(`https://cdn.test/user-news/${draft.id}.webp`);
    const pub = ctx.storage.public.get(`user-news/${draft.id}.webp`)!;
    expect(pub.mime).toBe("image/webp");
    expect(Buffer.from(pub.bytes).includes(Buffer.from("secret-author-name"))).toBe(false);
    expect([...ctx.storage.public.keys()]).toEqual([`user-news/${draft.id}.webp`]);
  });

  it("media processing never blocks the text: a story can be submitted while an upload is still pending", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    await slot(ctx, draft.id, "image", "image/jpeg", 1000); // pending, never finalized
    await approveByAuthor(ctx.deps, AUTHOR, draft.id);
    expect(code(await submitForModeration(ctx.deps, AUTHOR, draft.id))).toBe("ok");
  });
});

describe("voice notes", () => {
  it("transcribes a valid recording into the story's source text; the author can correct it", async () => {
    const ctx = makeDeps({
      chat: chatReturning(goodDraft),
      stt: async () => ({ ok: true, transcript: "आज सुबह रायपुर के शंकर नगर चौक पर दो बाइक की टक्कर हो गई तीन लोग घायल हुए", confidence: 0.91, durationMs: 12_000 }),
      env: { IDENTITY_MANUAL_ATTESTATION_ENABLED: "true" },
    });
    verify(ctx.repo, AUTHOR);
    const created = await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: "" });
    if (!created.ok) throw new Error("create");
    const slotR = await createMediaSlot(ctx.deps, AUTHOR, created.submission.id, { kind: "voice", mime: "audio/webm;codecs=opus", sizeBytes: 1 });
    if (!slotR.ok) throw new Error("slot");
    ctx.storage.put(slotR.upload.path, webmAudio());
    expect(code(await transcribeVoice(ctx.deps, AUTHOR, created.submission.id, slotR.mediaId))).toBe("not_ready");
    await finalizeMedia(ctx.deps, AUTHOR, slotR.mediaId);
    const t = await transcribeVoice(ctx.deps, AUTHOR, created.submission.id, slotR.mediaId);
    expect(t.ok && t.submission.input_kind).toBe("voice");
    expect(t.ok && t.transcript).toContain("शंकर नगर");
    const fixed = await editTranscript(ctx.deps, AUTHOR, created.submission.id, "आज सुबह रायपुर के शंकर नगर चौक पर दो बाइक की टक्कर हो गई। तीन लोग घायल हुए। लोग उन्हें अस्पताल ले गए।");
    expect(code(fixed)).toBe("ok");
    // the AI draft is built from the voice transcript
    expect(code(await generateDraft(ctx.deps, AUTHOR, created.submission.id))).toBe("ok");
  });

  it("reports speech-to-text as unavailable instead of faking a transcript", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    const slotR = await createMediaSlot(ctx.deps, AUTHOR, draft.id, { kind: "voice", mime: "audio/webm", sizeBytes: 1 });
    if (!slotR.ok) throw new Error("slot");
    ctx.storage.put(slotR.upload.path, webmAudio());
    await finalizeMedia(ctx.deps, AUTHOR, slotR.mediaId);
    const r = await transcribeVoice(ctx.deps, AUTHOR, draft.id, slotR.mediaId);
    expect(code(r)).toBe("stt_unconfigured");
    expect(status(r)).toBe(503);
  });

  it("rejects a 'voice note' that is really a video or an executable", async () => {
    const ctx = setup();
    const draft = await toAiDraft(ctx);
    const slotR = await createMediaSlot(ctx.deps, AUTHOR, draft.id, { kind: "voice", mime: "audio/webm", sizeBytes: 1 });
    if (!slotR.ok) throw new Error("slot");
    ctx.storage.put(slotR.upload.path, mp4({ durationMs: 1000, width: 640, height: 360 }));
    expect(code(await finalizeMedia(ctx.deps, AUTHOR, slotR.mediaId))).toBe("unsupported_type");
  });
});

describe("My News", () => {
  it("shows real engagement for published stories and states plainly that revenue sharing is not active", async () => {
    const ctx = setup();
    const s = await toSubmitted(ctx);
    await moderate(ctx.deps, MOD, s.id, { decision: "approve", acknowledgeFlags: true });
    ctx.repo.stats = [{ submission_id: s.id, views_total: 120, views_today: 9, views_7d: 80, unique_viewers: 55, likes_total: 12, comments_total: 3, engagement_rate_pct: 12.5 }];
    const r = await listMyNews(ctx.deps, AUTHOR);
    if (!r.ok) throw new Error("list");
    expect(r.items[0]!.stats).toEqual({ viewsTotal: 120, viewsToday: 9, views7d: 80, uniqueViewers: 55, likes: 12, comments: 3, engagementRatePct: 12.5 });
    expect(r.monetization).toEqual({ active: false, message: "Advertising revenue sharing not active" });
    expect(JSON.stringify(r)).not.toMatch(/revenue_|earnings|payout/);
  });

  it("an unpublished story has no engagement numbers (never a fake zero)", async () => {
    const ctx = setup();
    await toAiDraft(ctx);
    const r = await listMyNews(ctx.deps, AUTHOR);
    expect(r.ok && r.items[0]!.stats).toBeNull();
  });
});

describe("moderator review bundle", () => {
  it("returns the source, AI draft history, media with short-lived URLs and only the verification RESULT", async () => {
    const ctx = setup();
    ctx.repo.names.set(AUTHOR, "रमेश");
    const draft = await toAiDraft(ctx);
    const slotR = await createMediaSlot(ctx.deps, AUTHOR, draft.id, { kind: "image", mime: "image/jpeg", sizeBytes: 1 });
    if (!slotR.ok) throw new Error("slot");
    ctx.storage.put(slotR.upload.path, await img("jpeg", 1600, 900));
    await finalizeMedia(ctx.deps, AUTHOR, slotR.mediaId);
    const r = await getReviewBundle(ctx.deps, draft.id);
    if (!r.ok) throw new Error("bundle");
    expect(r.bundle.revisions.map((x) => x.kind)).toEqual(["source", "ai_draft"]);
    expect(r.bundle.media[0]!.previewUrl).toContain("sig=1");
    expect(r.bundle.author).toEqual({ id: AUTHOR, displayName: "रमेश", verification: { status: "verified", provider: "manual_admin", verifiedAt: "2026-09-01T00:00:00.000Z" } });
    expect(JSON.stringify(r.bundle.author)).not.toMatch(/aadhaar|otp|biometric/i);
  });
});

describe("verification records", () => {
  it("writes the result, an event and an audit entry together", async () => {
    const ctx = setup({ verified: false });
    const r = await recordVerification(ctx.deps, { userId: AUTHOR, status: "verified", provider: "manual_admin", reference: "CASE-2026-0001", actorKind: "admin", actorId: MOD });
    expect(code(r)).toBe("ok");
    expect(ctx.repo.verification.get(AUTHOR)).toMatchObject({ status: "verified", provider: "manual_admin" });
    expect(ctx.repo.verificationEvents).toHaveLength(1);
    expect(ctx.repo.verificationEvents[0]).toMatchObject({ from_status: null, to_status: "verified", actor_kind: "admin", reference: "CASE-2026-0001" });
    expect(ctx.repo.audits.some((a) => a.action === "verification.changed")).toBe(true);
    // and the user can now post
    expect(code(await createSubmission(ctx.deps, AUTHOR, { language: "hi", text: SOURCE }))).toBe("ok");
  });
});
