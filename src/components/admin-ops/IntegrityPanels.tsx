"use client";

import { Av3DataTable, Av3EmptyState, Av3Panel } from "@/components/admin-v3";
import { ageMinutes, formatAge } from "@/lib/admin-ops/health";
import type { OpsView } from "@/lib/admin-ops/snapshot";
import { fmt, ToneDot } from "@/components/admin-ops/OpsPanels";

const ago = (iso: string | null | undefined, now: number) => formatAge(ageMinutes(iso, now));

// ------------------------------------------------------------------ Feed integrity (canonical gate, same code as the site)

export function FeedIntegrityPanel({ view, now }: { view: OpsView; now: number }) {
  const i = view.integrity;
  if (!i) {
    return (
      <Av3Panel title="Public feed integrity" subtitle="What readers can actually see.">
        <Av3EmptyState title="Integrity data unavailable" message="Apply migration 099 (admin_feed_integrity) and reload. Nothing is estimated while it is missing." />
      </Av3Panel>
    );
  }
  const f = i.freshness;
  const g = i.geography;
  const l = i.language;
  const classRows: Array<[string, number, number]> = [
    ["District-specific", g.eligibleByClass.district, g.districtSpecificToday],
    ["Chhattisgarh statewide", g.eligibleByClass.chhattisgarh_statewide, g.statewideToday],
    ["India / national", g.eligibleByClass.india, g.indiaToday],
    ["International", g.eligibleByClass.international, g.internationalToday],
  ];
  return (
    <Av3Panel
      title="Public feed integrity"
      subtitle="Computed with the same eligibility code the site runs (public status, 30-day window, headline fitness, geography), so this can never disagree with what readers see."
    >
      <div className="ops-shares">
        <div className="ops-share"><b><ToneDot tone={f.ingestion.tone} /> {ago(f.ingestion.newestSignalAt, now)}</b><span>Ingestion · newest signal stored</span></div>
        <div className="ops-share"><b><ToneDot tone={f.editorial.tone} /> {ago(f.editorial.latestPublishedAt, now)}</b><span>Editorial · latest published</span></div>
        <div className="ops-share"><b><ToneDot tone={f.publicFeed.tone} /> {ago(f.publicFeed.newestEligibleAt, now)}</b><span>Public feed · newest story readers see</span></div>
        <div className="ops-share"><b>{fmt(f.publishedLast1h)} · {fmt(f.publishedLast6h)} · {fmt(f.publishedLast24h)} · {fmt(f.publishedLast48h)}</b><span>Published 1h · 6h · 24h · 48h</span></div>
        <div className="ops-share"><b><ToneDot tone={f.health24h} /> {f.health24h}</b><span>24h publishing health</span></div>
        <div className="ops-share"><b><ToneDot tone={f.health48h} /> {f.health48h}</b><span>48h publishing health</span></div>
      </div>
      {f.stale ? (
        <p className="ops-kpi__hint" style={{ marginTop: "0.6rem" }} role="status">
          The newest story readers can see is older than 24 hours
          {view.pipeline.state === "paused" ? " — the scheduler is OFF, so nothing new is being produced." : "."}
        </p>
      ) : null}

      <details style={{ marginTop: "0.9rem" }} open>
        <summary>
          Geography — readers can see {fmt(f.publicFeed.eligiblePublicAll)} stories ({fmt(f.publicFeed.eligibleLatest)} in the Chhattisgarh-first Latest/Live)
        </summary>
        <div className="ops-table-scroll">
          <Av3DataTable
            rows={classRows}
            rowKey={(r) => r[0]}
            columns={[
              { key: "c", header: "Class (kept separate, never one total)", render: (r) => r[0] },
              { key: "e", header: "Visible now", numeric: true, render: (r) => fmt(r[1]) },
              { key: "t", header: "Published today (IST)", numeric: true, render: (r) => fmt(r[2]) },
            ]}
          />
        </div>
        <p className="ops-kpi__hint">
          Chhattisgarh today (district + statewide): {fmt(g.chhattisgarhToday)} · Approved with UNKNOWN geography (excluded from every public timeline): {fmt(g.approvedUnknown)} · Rows
          whose geography is text-derived (not allowed on district pages): {fmt(g.withoutStoredScope)}
        </p>
        <p className="ops-kpi__hint">
          Conflicting geography: {fmt(g.conflicting.length)} · Possible district leakage (stored district differs from the district in the headline): {fmt(g.districtLeakageCandidates.length)} ·
          Dropped from Latest by policy: {Object.entries(g.latestDroppedByScope).map(([k, n]) => `${k} ×${n}`).join(" · ") || "none"}
        </p>
      </details>

      <details style={{ marginTop: "0.6rem" }}>
        <summary>Language and headlines</summary>
        <p className="ops-kpi__hint">
          Visible: {Object.entries(l.eligibleByLanguage).map(([k, n]) => `${k} ${n}`).join(" · ") || "none"} · Missing language: {fmt(l.missingLanguage)} · Language/script conflicts:{" "}
          {fmt(l.conflicting)} · Translation coverage: {l.bilingual.coveragePct === null ? "n/a" : `${l.bilingual.coveragePct}%`} (Hindi→English {l.bilingual.hiWithEn}/{l.bilingual.hiTotal},
          English→Hindi {l.bilingual.enWithHi}/{l.bilingual.enTotal}) · Events with several separate rows: {fmt(l.multiRepresentationEvents)}
        </p>
        <p className="ops-kpi__hint">
          Generic headlines: {fmt(i.headlines.generic)} · Exact duplicates: {fmt(i.headlines.exactDuplicates)} · Near duplicates: {fmt(i.headlines.nearDuplicates)} · Repetitive openings:{" "}
          {fmt(i.headlines.repetitiveOpenings)} · Hidden by the public gate: {Object.entries(i.gate.droppedByReason).map(([k, n]) => `${k} ×${n}`).join(" · ") || "nothing"}
        </p>
      </details>
    </Av3Panel>
  );
}

// ------------------------------------------------------------------ Editorial efficiency

export function EfficiencyPanel({ view }: { view: OpsView }) {
  const e = view.efficiency;
  if (!e) {
    return (
      <Av3Panel title="Editorial efficiency" subtitle="Recorded generation, repair, rejection and token numbers.">
        <Av3EmptyState title="Efficiency data unavailable" message="Apply migration 099 (admin_editorial_efficiency) and reload. Nothing is estimated while it is missing." />
      </Av3Panel>
    );
  }
  const secs = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1)}s`);
  const p = (n: number | null) => (n === null ? "no data" : `${n}%`);
  return (
    <Av3Panel title={`Editorial efficiency · last ${e.windowHours}h`} subtitle="Recorded in the usage log. A ratio with nothing to divide shows 'no data', never 0.">
      <div className="ops-shares">
        <div className="ops-share"><b>{fmt(e.generate.calls)}</b><span>Generate calls · {p(e.generate.okPct)} ok · {secs(e.generate.avg_latency_ms)} avg</span></div>
        <div className="ops-share"><b>{fmt(e.repair.calls)}</b><span>Repair calls · {p(e.repair.okPct)} ok · {secs(e.repair.avg_latency_ms)} avg</span></div>
        <div className="ops-share"><b><ToneDot tone={e.repairTone} /> {p(e.repairPct)}</b><span>Repair rate (repair ÷ generate calls)</span></div>
        <div className="ops-share"><b><ToneDot tone={e.rejectionTone} /> {p(e.rejectionPct)}</b><span>Validation rejection ({fmt(e.articles.not_publish)} of {fmt(e.articles.generated)} drafts)</span></div>
        <div className="ops-share"><b>{fmt(e.tokens)}</b><span>Tokens used</span></div>
        <div className="ops-share"><b>{e.tokensPerApprovedArticle === null ? "no data" : fmt(e.tokensPerApprovedArticle)}</b><span>Tokens per approved article</span></div>
      </div>
      <p className="ops-kpi__hint" style={{ marginTop: "0.6rem" }} role="status">
        <ToneDot tone={e.providerPolicy.geminiEditorialCallsTone} /> {e.providerPolicy.message}
      </p>
      <details style={{ marginTop: "0.6rem" }}>
        <summary>Provider / model breakdown</summary>
        <div className="ops-table-scroll">
          <Av3DataTable
            rows={e.models}
            rowKey={(m) => `${m.provider}|${m.model}|${m.operation}`}
            columns={[
              { key: "p", header: "Provider", render: (m) => m.provider },
              { key: "m", header: "Model", render: (m) => m.model },
              { key: "o", header: "Operation", render: (m) => m.operation },
              { key: "c", header: "Calls", numeric: true, render: (m) => fmt(m.calls) },
              { key: "k", header: "OK", numeric: true, render: (m) => fmt(m.ok) },
              { key: "l", header: "Avg latency", numeric: true, render: (m) => secs(m.avg_latency_ms) },
              { key: "t", header: "Tokens", numeric: true, render: (m) => fmt(m.tokens) },
            ]}
          />
        </div>
      </details>
    </Av3Panel>
  );
}
