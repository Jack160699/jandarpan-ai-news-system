"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSupabase } from "@/hooks/useSupabase";
import { CG_DISTRICTS } from "@/lib/regional/districts";
import { userNewsApi } from "@/features/user-news/api";
import { tUserNews, type UserNewsLocale, type UserNewsStringKey } from "@/features/user-news/strings";
import { clientPrecheck, uploadMedia, type UploadClient } from "@/features/user-news/upload";
import { useVoiceRecorder } from "@/features/user-news/useVoiceRecorder";
import { canApprove, canContinueStep1, canSubmit, geoNote, mediaStatusLabel, stepForStatus, summarizeFlags, type WizardStep } from "@/features/user-news/wizard-model";
import type { OwnSubmissionView, PostNewsStatus } from "@/lib/user-news/service";

const card: React.CSSProperties = { background: "#fff", border: "1px solid #d9dee8", borderRadius: 12, padding: 16, marginBottom: 14 };
const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #b8c0d0", borderRadius: 8, padding: "10px 12px", fontSize: 15, fontFamily: "inherit" };
const btn = (kind: "primary" | "ghost" | "danger" = "primary", disabled = false): React.CSSProperties => ({
  padding: "11px 18px",
  borderRadius: 8,
  fontWeight: 800,
  fontSize: 14,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.55 : 1,
  border: kind === "ghost" ? "1px solid #b8c0d0" : "none",
  background: kind === "primary" ? "#0a1628" : kind === "danger" ? "#a4262c" : "transparent",
  color: kind === "ghost" ? "#0a1628" : "#fff",
});

type LocalMedia = { key: string; kind: "image" | "video"; name: string; status: "uploading" | "ready" | "pending" | "rejected"; message?: string };

export function PostNewsWizard() {
  const { language } = useLanguage();
  const locale: UserNewsLocale = language === "en" ? "en" : "hi";
  const t = useCallback((k: UserNewsStringKey) => tUserNews(locale, k), [locale]);
  const { client } = useSupabase();
  const voice = useVoiceRecorder(60);

  const [status, setStatus] = useState<PostNewsStatus | null>(null);
  const [step, setStep] = useState<WizardStep>(1);
  const [subId, setSubId] = useState<string | null>(null);
  const [storyLang, setStoryLang] = useState<"hi" | "en">(locale);
  const [text, setText] = useState("");
  const [place, setPlace] = useState("");
  const [district, setDistrict] = useState("");
  const [transcript, setTranscript] = useState("");
  const [voiceDone, setVoiceDone] = useState(false);
  const [media, setMedia] = useState<LocalMedia[]>([]);
  const [view, setView] = useState<OwnSubmissionView | null>(null);
  const [edit, setEdit] = useState({ headline: "", subheadline: "", summary: "", body: "" });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const applyView = useCallback((v: OwnSubmissionView) => {
    setView(v);
    setEdit({ headline: v.submission.headline ?? "", subheadline: v.submission.subheadline ?? "", summary: v.submission.summary ?? "", body: v.submission.body ?? "" });
    setDirty(false);
  }, []);

  // status + resume (?id=...)
  useEffect(() => {
    void userNewsApi.status().then((r) => r.ok && setStatus(r.data.status));
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    void userNewsApi.detail(id).then((r) => {
      if (!r.ok) return;
      const v = r.data.view;
      setSubId(id);
      setStoryLang(v.submission.language);
      setText(v.submission.raw_text ?? "");
      setTranscript(v.submission.transcript ?? "");
      setPlace(v.submission.location_text ?? "");
      setDistrict(v.submission.declared_district ?? "");
      applyView(v);
      setStep(stepForStatus(v.submission.status, Boolean(v.submission.headline)));
    });
  }, [applyView]);

  const fail = (message?: string) => setError(message || t("error"));
  const refresh = useCallback(async (id: string) => {
    const r = await userNewsApi.detail(id);
    if (r.ok) applyView(r.data.view);
    return r;
  }, [applyView]);

  // ---------------- step 1 ----------------
  const step1 = canContinueStep1({ text, hasVoice: Boolean(voice.blob), transcript });

  async function onStep1() {
    setError(null);
    if (!step1.ok) return fail(t("tellPlaceholder"));
    setBusy(t("checking"));
    try {
      let id = subId;
      const payload = { text: text.trim() || null, locationText: place.trim() || null, declaredDistrict: district || null };
      if (!id) {
        const c = await userNewsApi.create({ language: storyLang, ...payload });
        if (!c.ok) return fail(c.message);
        id = c.data.id;
        setSubId(id);
      } else {
        const u = await userNewsApi.source(id, payload);
        if (!u.ok) return fail(u.message);
      }
      if (voice.blob && !voiceDone && client) {
        setBusy(t("uploading"));
        const up = await uploadMedia({ client: client as unknown as UploadClient, api: userNewsApi }, id, "voice", voice.blob as Blob & { type: string });
        if (!up.ok) return fail(up.message);
        const tr = await userNewsApi.transcribe(id, up.mediaId);
        if (!tr.ok) return fail(tr.message);
        setTranscript(tr.data.transcript);
        setVoiceDone(true);
        return; // show the transcript so the author can correct it, then continue
      }
      if (transcript.trim()) {
        const s = await userNewsApi.saveTranscript(id, transcript);
        if (!s.ok) return fail(s.message);
      }
      setStep(2);
    } finally {
      setBusy(null);
    }
  }

  // ---------------- step 2 ----------------
  async function onFile(kind: "image" | "video", f: File | undefined) {
    if (!f || !subId || !client) return;
    setError(null);
    const pre = clientPrecheck(kind, f);
    const key = `${f.name}-${Date.now()}`;
    if (pre) return setMedia((m) => [...m, { key, kind, name: f.name, status: "rejected", message: pre }]);
    setMedia((m) => [...m, { key, kind, name: f.name, status: "uploading" }]);
    const out = await uploadMedia({ client: client as unknown as UploadClient, api: userNewsApi }, subId, kind, f);
    setMedia((m) =>
      m.map((x) => (x.key !== key ? x : out.ok ? { ...x, status: out.status === "ready" ? "ready" : out.needsProbe ? "pending" : "pending" } : { ...x, status: "rejected", message: out.message }))
    );
  }

  // ---------------- step 3 ----------------
  async function onDraft() {
    if (!subId) return;
    setError(null);
    setBusy(t("drafting"));
    try {
      const r = await userNewsApi.draft(subId);
      if (!r.ok) return fail(r.message);
      applyView(r.data.view);
      setStep(4);
    } finally {
      setBusy(null);
    }
  }

  // ---------------- step 4 ----------------
  async function onSave() {
    if (!subId) return;
    setError(null);
    setBusy(t("checking"));
    try {
      const r = await userNewsApi.edit(subId, { headline: edit.headline, subheadline: edit.subheadline || null, summary: edit.summary, body: edit.body });
      if (!r.ok) return fail(r.message);
      await refresh(subId);
    } finally {
      setBusy(null);
    }
  }

  async function onApprove() {
    if (!subId) return;
    setError(null);
    setBusy(t("checking"));
    try {
      const r = await userNewsApi.approve(subId);
      if (!r.ok) return fail(r.message);
      await refresh(subId);
      setStep(5);
    } finally {
      setBusy(null);
    }
  }

  async function onSubmit() {
    if (!subId) return;
    setError(null);
    setBusy(t("checking"));
    try {
      const r = await userNewsApi.submit(subId);
      if (!r.ok) return fail(r.message);
      setSubmitted(true);
    } finally {
      setBusy(null);
    }
  }

  const flags = useMemo(() => (view ? summarizeFlags(view.submission, locale) : null), [view, locale]);
  const geo = view ? geoNote(view.submission.geo as Record<string, unknown>) : null;
  const gateOpen = status?.allowed ?? false;

  const stepTitles: UserNewsStringKey[] = ["step1", "step2", "step3", "step4", "step5"];

  if (status && !gateOpen) {
    return (
      <div style={card} role="status" data-testid="wizard-locked">
        <h2 style={{ marginTop: 0 }}>{t("postNews")}</h2>
        <p>{status.reason === "verification_unavailable" ? t("verificationUnavailable") : status.reason === "not_authenticated" ? t("signInToPost") : status.reason === "not_verified" ? t("verifyToPost") : status.message}</p>
        <Link href="/profile" style={{ fontWeight: 800 }}>
          {t("back")}
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="post-news-wizard">
      <ol style={{ display: "flex", gap: 6, listStyle: "none", padding: 0, margin: "0 0 14px", flexWrap: "wrap" }} aria-label="steps">
        {stepTitles.map((k, i) => (
          <li key={k} aria-current={step === i + 1 ? "step" : undefined} style={{ fontSize: 12, fontWeight: 800, padding: "5px 9px", borderRadius: 999, background: step === i + 1 ? "#0a1628" : "#e8ecf4", color: step === i + 1 ? "#f6d36b" : "#445" }}>
            {i + 1}. {t(k)}
          </li>
        ))}
      </ol>

      {error ? (
        <div role="alert" style={{ ...card, borderColor: "#a4262c", color: "#a4262c", fontWeight: 700 }}>
          {error}
        </div>
      ) : null}
      {busy ? (
        <div role="status" style={{ ...card, background: "#f4f7fb" }}>
          {busy}
        </div>
      ) : null}

      {step === 1 ? (
        <section style={card}>
          <h2 style={{ marginTop: 0 }}>{t("step1")}</h2>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>{t("langLabel")}</label>
          <select value={storyLang} onChange={(e) => setStoryLang(e.target.value as "hi" | "en")} style={{ ...field, marginBottom: 12 }} disabled={Boolean(subId)}>
            <option value="hi">{t("hindi")}</option>
            <option value="en">{t("english")}</option>
          </select>

          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("tellPlaceholder")} rows={7} maxLength={7000} style={field} aria-label={t("step1")} />

          <div style={{ margin: "12px 0" }}>
            {voice.state === "unsupported" || !status?.features.voice ? (
              <p style={{ fontSize: 13, color: "#556" }}>{!status?.features.voice ? t("voiceUnavailable") : t("voiceUnsupportedBrowser")}</p>
            ) : (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {voice.state === "recording" ? (
                  <button type="button" onClick={voice.stop} style={btn("danger")}>
                    ■ {t("stopRecording")} ({voice.seconds}s)
                  </button>
                ) : (
                  <button type="button" onClick={() => void voice.start()} style={btn("ghost")} disabled={voice.state === "denied"}>
                    🎙 {t("recordVoice")}
                  </button>
                )}
                <span style={{ fontSize: 12, color: "#556" }}>{voice.state === "recording" ? t("recording") : t("voiceMax")}</span>
                {voice.blob ? <audio controls src={URL.createObjectURL(voice.blob)} style={{ maxWidth: "100%" }} /> : null}
              </div>
            )}
          </div>

          {transcript || voiceDone ? (
            <>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>{t("transcript")}</label>
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={5} style={{ ...field, marginBottom: 12 }} />
            </>
          ) : null}

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>{t("location")}</label>
              <input value={place} onChange={(e) => setPlace(e.target.value)} style={field} maxLength={160} />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>{t("district")}</label>
              <select value={district} onChange={(e) => setDistrict(e.target.value)} style={field}>
                <option value="">{t("noDistrict")}</option>
                {CG_DISTRICTS.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {locale === "hi" ? d.nameHi : d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="button" onClick={() => void onStep1()} disabled={Boolean(busy) || !step1.ok} style={btn("primary", Boolean(busy) || !step1.ok)}>
              {t("continue")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section style={card}>
          <h2 style={{ marginTop: 0 }}>{t("step2")}</h2>
          <p style={{ fontSize: 13, color: "#556" }}>{t("mediaHint")}</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "10px 0" }}>
            <label style={btn("ghost")}>
              🖼 {t("addImage")}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void onFile("image", e.target.files?.[0])} />
            </label>
            <label style={btn("ghost")}>
              🎬 {t("addVideo")}
              <input type="file" accept="video/mp4,video/webm" hidden onChange={(e) => void onFile("video", e.target.files?.[0])} />
            </label>
          </div>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {media.map((m) => (
              <li key={m.key} style={{ padding: "6px 0", fontSize: 14, color: m.status === "rejected" ? "#a4262c" : "inherit" }}>
                {m.kind === "image" ? "🖼" : "🎬"} {m.name} — {m.status === "uploading" ? t("uploading") : m.status === "ready" ? t("ready") : m.status === "pending" ? t("pendingCheck") : `${t("rejected")}${m.message ? `: ${m.message}` : ""}`}
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button type="button" style={btn("ghost")} onClick={() => setStep(1)}>
              {t("back")}
            </button>
            <button type="button" style={btn("primary", media.some((m) => m.status === "uploading"))} disabled={media.some((m) => m.status === "uploading")} onClick={() => setStep(3)}>
              {media.length ? t("continue") : t("skip")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section style={card}>
          <h2 style={{ marginTop: 0 }}>{t("step3")}</h2>
          <p>{t("aiBanner")}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" style={btn("ghost")} onClick={() => setStep(2)} disabled={Boolean(busy)}>
              {t("back")}
            </button>
            <button type="button" style={btn("primary", Boolean(busy))} disabled={Boolean(busy)} onClick={() => void onDraft()}>
              {t("createDraft")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 && view ? (
        <section style={card}>
          <h2 style={{ marginTop: 0 }}>{t("step4")}</h2>
          <p role="note" style={{ background: "#fff8e1", border: "1px solid #f0d27a", padding: "8px 12px", borderRadius: 8, fontWeight: 700 }}>
            {t("aiBanner")}
          </p>

          {(["headline", "subheadline", "summary"] as const).map((k) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>{t(k)}</label>
              <input value={edit[k]} onChange={(e) => { setEdit((s) => ({ ...s, [k]: e.target.value })); setDirty(true); }} style={field} />
            </div>
          ))}
          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>{t("body")}</label>
          <textarea value={edit.body} onChange={(e) => { setEdit((s) => ({ ...s, body: e.target.value })); setDirty(true); }} rows={12} style={field} />

          {flags && (flags.blockingFacts.length || flags.blockingRisk.length || flags.reviewRisk.length || flags.warnings.length) ? (
            <div style={{ margin: "14px 0" }} data-testid="flags">
              {flags.blockingFacts.length ? (
                <div role="alert" style={{ color: "#a4262c", fontWeight: 700 }}>
                  ⚠ {t("blockingFacts")}
                  <ul>{flags.blockingFacts.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              ) : null}
              {flags.blockingRisk.length ? (
                <div role="alert" style={{ color: "#a4262c", fontWeight: 700 }}>
                  ⚠ {t("riskBlock")}
                  <ul>{flags.blockingRisk.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              ) : null}
              {flags.reviewRisk.length ? (
                <div style={{ color: "#7a5a00" }}>
                  ℹ {t("riskReview")}: {flags.reviewRisk.join(", ")}
                </div>
              ) : null}
            </div>
          ) : null}

          {geo ? (
            <p style={{ fontSize: 13, color: geo.kind === "found" ? "#0f6b3a" : "#7a5a00" }}>
              📍 {geo.kind === "found" ? t("placeFound") : geo.kind === "unknown" ? t("placeUnknown") : t("districtUnverified")}
            </p>
          ) : null}

          {view.readiness.problems.length ? (
            <div role="alert" style={{ color: "#a4262c" }}>
              <strong>{t("problems")}:</strong>
              <ul>{view.readiness.problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          ) : null}

          {view.moderation.length ? (
            <div style={{ background: "#eef3ff", padding: 10, borderRadius: 8, margin: "10px 0" }}>
              <strong>{t("moderatorNote")}:</strong> {view.moderation[view.moderation.length - 1]!.reason}
            </div>
          ) : null}

          <p style={{ fontSize: 13, color: "#556" }}>{t("editToApprove")}</p>
          <p style={{ fontSize: 13 }}>
            <Link href="/contributor-terms" target="_blank">
              {t("contributorTerms")}
            </Link>
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" style={btn("ghost")} onClick={() => setStep(2)} disabled={Boolean(busy)}>
              {t("back")}
            </button>
            <button type="button" style={btn("ghost", !dirty || Boolean(busy))} disabled={!dirty || Boolean(busy)} onClick={() => void onSave()}>
              {t("saveChanges")}
            </button>
            <button type="button" style={btn("primary", !canApprove(view, dirty) || Boolean(busy))} disabled={!canApprove(view, dirty) || Boolean(busy)} onClick={() => void onApprove()}>
              ✓ {t("approve")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 5 && view ? (
        <section style={card}>
          <h2 style={{ marginTop: 0 }}>{t("step5")}</h2>
          {submitted ? (
            <div role="status" data-testid="submitted">
              <h3>{t("submittedTitle")}</h3>
              <p>{t("submittedBody")}</p>
              <Link href="/profile/my-news" style={{ fontWeight: 800 }}>
                {t("openMyNews")}
              </Link>
            </div>
          ) : (
            <>
              <p>✓ {t("approved")}</p>
              <h3>{view.submission.headline}</h3>
              <p>{view.submission.summary}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" style={btn("ghost")} onClick={() => setStep(4)} disabled={Boolean(busy)}>
                  {t("continueEditing")}
                </button>
                <button type="button" style={btn("primary", !canSubmit(view).ok || Boolean(busy))} disabled={!canSubmit(view).ok || Boolean(busy)} onClick={() => void onSubmit()}>
                  {t("submit")}
                </button>
              </div>
              {!canSubmit(view).ok && canSubmit(view).reason === "media_problem" ? (
                <p role="alert" style={{ color: "#a4262c" }}>{view.media.filter((m) => mediaStatusLabel(m.status) === "rejected").map((m) => m.problem).filter(Boolean).join(" ")}</p>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
