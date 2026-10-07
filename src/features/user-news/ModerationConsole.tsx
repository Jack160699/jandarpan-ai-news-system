"use client";

import { useCallback, useEffect, useState } from "react";
import { adminGet, adminPost } from "@/lib/admin-v3/admin-fetch";
import { allowedDecisions, checkDecision, requestBody, type ModDecision, type QueueFlag } from "@/features/user-news/moderation-model";

export type QueueItem = {
  id: string;
  status: string;
  language: "hi" | "en";
  headline: string | null;
  category: string | null;
  scope: string | null;
  district: string | null;
  declaredDistrict: string | null;
  riskFlags: QueueFlag[];
  factFlags: QueueFlag[];
  inputKind: string;
  submittedAt: string | null;
  authorId: string;
};

type Bundle = {
  submission: { id: string; status: string; headline: string | null; subheadline: string | null; summary: string | null; body: string | null; raw_text: string | null; transcript: string | null; declared_district: string | null; location_text: string | null; geo: Record<string, unknown>; risk_flags: Array<QueueFlag & { evidence?: string }>; fact_flags: Array<QueueFlag & { evidence?: string }> };
  moderation: Array<{ decision: string; reason_text: string | null; created_at: string }>;
  media: Array<{ id: string; kind: string; status: string; previewUrl: string | null }>;
  author: { id: string; displayName: string | null; verification: { status: string; provider: string | null; verifiedAt: string | null } };
};

const STATUS_TABS = [
  { key: "submitted,under_review", label: "Awaiting review" },
  { key: "approved", label: "Approved, not live" },
  { key: "published", label: "Published" },
] as const;

const DECISION_LABEL: Record<ModDecision, string> = { approve: "Approve & publish", reject: "Reject", request_edit: "Ask author to edit", hold: "Hold", block: "Block", unpublish: "Take down", confirm_district: "Confirm declared district" };

const card = { background: "#fff", border: "1px solid #d9dee8", borderRadius: 10, padding: 12, marginBottom: 10 } as const;

function Flags({ flags, title }: { flags: Array<QueueFlag & { evidence?: string }>; title: string }) {
  if (!flags.length) return null;
  return (
    <div style={{ margin: "6px 0" }}>
      <strong style={{ fontSize: 12 }}>{title}</strong>
      <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13 }}>
        {flags.map((f, i) => (
          <li key={`${f.code}-${i}`} style={{ color: f.severity === "block" ? "#a4262c" : f.severity === "review" ? "#8a5a00" : "#445" }}>
            <b>{f.severity}</b> · {f.code}
            {f.evidence ? ` — ${f.evidence}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ModerationConsole() {
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["key"]>("submitted,under_review");
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setError(null);
    const r = await adminGet<{ items: QueueItem[] }>(`/api/admin/user-news?status=${encodeURIComponent(tab)}`);
    if (!r.ok) {
      setItems([]);
      return setError(r.status === 403 ? "You do not have permission to moderate user news." : `Could not load the queue (${r.error}).`);
    }
    setItems(r.data.items);
  }, [tab]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  async function open(id: string) {
    setOpenId(id);
    setBundle(null);
    setReason("");
    setAcknowledged(false);
    setNotice(null);
    const r = await adminGet<{ bundle: Bundle }>(`/api/admin/user-news/${id}`);
    if (!r.ok) return setNotice(`Could not load the story (${r.error}).`);
    setBundle(r.data.bundle);
  }

  async function decide(decision: ModDecision) {
    if (!bundle) return;
    const flags = bundle.submission.risk_flags;
    const check = checkDecision({ decision, reasonText: reason, flags, acknowledged, confirmedDistrict: bundle.submission.declared_district });
    if (!check.ok) return setNotice(check.reason);
    setBusy(true);
    const r = await adminPost<{ status: string }>(`/api/admin/user-news/${bundle.submission.id}/moderate`, requestBody({ decision, reasonText: reason, acknowledged, confirmedDistrict: bundle.submission.declared_district }));
    setBusy(false);
    if (!r.ok) return setNotice(`The server refused this decision: ${r.error}`);
    setNotice(`Done — story is now "${r.data.status}".`);
    await Promise.all([loadQueue(), open(bundle.submission.id)]);
  }

  return (
    <div data-testid="moderation-console">
      <div role="tablist" style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {STATUS_TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => { setTab(t.key); setOpenId(null); setBundle(null); }} style={{ padding: "7px 12px", borderRadius: 999, border: "1px solid #b8c0d0", fontWeight: 700, background: tab === t.key ? "#0a1628" : "#fff", color: tab === t.key ? "#f6d36b" : "#0a1628" }}>
            {t.label}
          </button>
        ))}
      </div>

      {error ? <p role="alert">{error}</p> : null}
      {items === null ? <p role="status">Loading…</p> : null}
      {items && !items.length && !error ? <p>Nothing in this queue.</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: openId ? "minmax(260px,1fr) minmax(320px,1.6fr)" : "1fr", gap: 14, alignItems: "start" }}>
        <div>
          {items?.map((i) => (
            <button key={i.id} type="button" onClick={() => void open(i.id)} style={{ ...card, display: "block", width: "100%", textAlign: "left", cursor: "pointer", outline: openId === i.id ? "2px solid #0a1628" : "none" }}>
              <div style={{ fontSize: 12, color: "#556" }}>
                {i.status} · {i.language} · {i.inputKind} · {i.district ?? i.scope ?? "no place"}
                {i.submittedAt ? ` · ${new Date(i.submittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : ""}
              </div>
              <div style={{ fontWeight: 800, margin: "4px 0" }}>{i.headline ?? "(no headline)"}</div>
              <div style={{ fontSize: 12 }}>
                {i.riskFlags.length ? `⚑ ${i.riskFlags.map((f) => f.code).join(", ")}` : "No risk flags"}
              </div>
            </button>
          ))}
        </div>

        {openId ? (
          <div data-testid="moderation-detail">
            {!bundle ? (
              <p role="status">Loading story…</p>
            ) : (
              <>
                <div style={card}>
                  <div style={{ fontSize: 12, color: "#556" }}>
                    Author: {bundle.author.displayName ?? bundle.author.id} · identity check: <b>{bundle.author.verification.status}</b>
                    {bundle.author.verification.provider ? ` (${bundle.author.verification.provider})` : ""}
                  </div>
                  <h2 style={{ fontSize: 18, margin: "6px 0" }}>{bundle.submission.headline}</h2>
                  {bundle.submission.subheadline ? <p style={{ margin: "0 0 6px", color: "#445" }}>{bundle.submission.subheadline}</p> : null}
                  <p style={{ fontWeight: 700 }}>{bundle.submission.summary}</p>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.55 }}>{bundle.submission.body}</div>
                </div>

                <div style={card}>
                  <strong style={{ fontSize: 12 }}>Author&apos;s original ({bundle.submission.transcript ? "voice transcript" : "text"})</strong>
                  <p style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{bundle.submission.transcript ?? bundle.submission.raw_text ?? "—"}</p>
                  <div style={{ fontSize: 12, color: "#556" }}>
                    Place: {bundle.submission.location_text ?? "—"} · declared district: {bundle.submission.declared_district ?? "—"} · resolved: {String((bundle.submission.geo as { districtSlug?: string | null }).districtSlug ?? (bundle.submission.geo as { scope?: string }).scope ?? "unknown")}
                  </div>
                  <Flags flags={bundle.submission.risk_flags} title="Risk flags" />
                  <Flags flags={bundle.submission.fact_flags} title="Fact-check flags (details the AI added that the author did not say)" />
                </div>

                {bundle.media.length ? (
                  <div style={card}>
                    <strong style={{ fontSize: 12 }}>Media</strong>
                    {bundle.media.map((m) => (
                      <div key={m.id} style={{ marginTop: 6, fontSize: 13 }}>
                        {m.kind} · {m.status}
                        {m.previewUrl && m.kind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.previewUrl} alt="" style={{ display: "block", maxWidth: "100%", maxHeight: 220, marginTop: 4, borderRadius: 6 }} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {bundle.moderation.length ? (
                  <div style={card}>
                    <strong style={{ fontSize: 12 }}>Moderation history</strong>
                    <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13 }}>
                      {bundle.moderation.map((m, i) => (
                        <li key={i}>
                          {m.decision}
                          {m.reason_text ? ` — ${m.reason_text}` : ""} · {new Date(m.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {allowedDecisions(bundle.submission.status).length ? (
                  <div style={card}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700 }} htmlFor="mod-reason">
                      Reason (shown to the author for reject / edit requests)
                    </label>
                    <textarea id="mod-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} style={{ width: "100%", boxSizing: "border-box", margin: "4px 0 8px" }} />
                    {bundle.submission.risk_flags.some((f) => f.severity === "review") ? (
                      <label style={{ display: "flex", gap: 6, fontSize: 13, marginBottom: 8 }}>
                        <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                        I have checked every review flag above.
                      </label>
                    ) : null}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {allowedDecisions(bundle.submission.status).map((d) => (
                        <button key={d} type="button" disabled={busy} onClick={() => void decide(d)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #b8c0d0", fontWeight: 800, background: d === "approve" ? "#0f6b3a" : d === "block" || d === "reject" || d === "unpublish" ? "#a4262c" : "#fff", color: d === "approve" || d === "block" || d === "reject" || d === "unpublish" ? "#fff" : "#0a1628" }}>
                          {DECISION_LABEL[d]}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {notice ? <p role="status" style={{ fontWeight: 700 }}>{notice}</p> : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
