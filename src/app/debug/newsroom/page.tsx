import { NewsroomCycleRunner } from "@/components/debug/NewsroomCycleRunner";
import { isDevNewsroomDebugAllowed } from "@/lib/newsroom/debug/guard";
import { captureNewsroomSnapshot } from "@/lib/newsroom/debug/snapshot";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewsroomDebugPage() {
  if (!isDevNewsroomDebugAllowed()) {
    notFound();
  }

  const snapshot = await captureNewsroomSnapshot();

  return (
    <main className="min-h-screen bg-[#0c0c0e] text-zinc-100">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-500/90">
          AI Newsroom
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          Pipeline diagnostics
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          RSS → signals → events → generated articles → homepage. Development only.
        </p>

        <section className="mt-10 space-y-6">
          <NewsroomCycleRunner />

          <Card title="Environment flags">
            <FlagRow label="NEWSROOM_CLUSTER_EVENTS" ok={snapshot.env.clusterEvents} />
            <FlagRow label="NEWSROOM_GENERATE_ARTICLES" ok={snapshot.env.generateArticles} />
            <FlagRow label="NEWSROOM_LEGACY_BRIDGE" ok={snapshot.env.legacyBridge} />
            <FlagRow label="OPENAI_API_KEY" ok={snapshot.env.openAiConfigured} />
            <FlagRow label="GNEWS_API_KEY" ok={snapshot.env.gnewsConfigured} />
            <FlagRow label="NEWSDATA_API_KEY" ok={snapshot.env.newsdataConfigured} />
            <FlagRow label="NEWSROOM_EDITORIAL_IMAGES" ok={snapshot.env.editorialImages} />
            <FlagRow label="NEWSROOM_USE_EMBEDDINGS" ok={snapshot.env.useEmbeddings} />
          </Card>

          <Card title="Table counts">
            <Row label="news_signals" value={snapshot.counts.news_signals} />
            <Row label="news_events" value={snapshot.counts.news_events} />
            <Row label="generated_articles" value={snapshot.counts.generated_articles} />
            <Row label="generated (published)" value={snapshot.counts.generated_published} />
            <Row label="news_articles (legacy)" value={snapshot.counts.news_articles} />
            <Row label="pending AI queue" value={snapshot.counts.pending_ai_queue} />
            <Row label="pending image queue" value={snapshot.counts.pending_editorial_images} />
          </Card>

          <Card title="Homepage readiness">
            <Row
              label="Feed ready"
              value={snapshot.homepage.ready ? "yes" : "no"}
              ok={snapshot.homepage.ready}
            />
            <Row label="Hero" value={snapshot.homepage.heroTitle ?? "—"} />
            <Row label="Pool size" value={snapshot.homepage.poolSize} />
            <Row
              label="Sections"
              value={Object.entries(snapshot.homepage.sectionCounts)
                .map(([k, v]) => `${k}:${v}`)
                .join(", ") || "—"}
            />
            {snapshot.homepage.error && (
              <p className="mt-2 text-xs text-red-400">{snapshot.homepage.error}</p>
            )}
          </Card>

          <Card title="Provider health">
            <h3 className="text-xs font-medium uppercase text-zinc-500">API</h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-300">
              {snapshot.providerHealth.api.length ? (
                snapshot.providerHealth.api.map((p) => (
                  <li key={p.provider_id}>
                    {p.provider_id} · score {p.health_score}
                    {p.disabled_until ? ` · disabled until ${p.disabled_until}` : ""}
                  </li>
                ))
              ) : (
                <li className="text-zinc-500">No API provider rows</li>
              )}
            </ul>
            <h3 className="mt-4 text-xs font-medium uppercase text-zinc-500">RSS</h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-300">
              {snapshot.providerHealth.rss.length ? (
                snapshot.providerHealth.rss.slice(0, 12).map((s) => (
                  <li key={s.source_id}>
                    {s.name} · failures {s.consecutive_failures}
                    {s.disabled_until ? ` · off until ${s.disabled_until}` : ""}
                  </li>
                ))
              ) : (
                <li className="text-zinc-500">No RSS health rows</li>
              )}
            </ul>
          </Card>

          <Card title="Latest signals">
            <ArticleList
              items={snapshot.latest.signals.map((s) => ({
                id: s.id,
                primary: s.title,
                meta: `${s.provider} · ${s.source ?? "—"}`,
              }))}
            />
          </Card>

          <Card title="Latest events">
            <ArticleList
              items={snapshot.latest.events.map((e) => ({
                id: e.id,
                primary: e.canonical_title,
                meta: `sources ${e.source_count} · ${e.region ?? "—"} · urgency ${e.urgency_score}`,
              }))}
            />
          </Card>

          <Card title="Generated articles">
            <ArticleList
              items={snapshot.latest.generated.map((g) => ({
                id: g.id,
                primary: g.headline,
                meta: `${g.editorial_status ?? "—"} · ${g.slug} · ${g.published_at ?? "unpublished"}`,
              }))}
            />
          </Card>

          {snapshot.ingestion.lastLog && (
            <Card title="Last ingestion log">
              <Row label="Status" value={snapshot.ingestion.lastLog.status} />
              <Row label="Inserted" value={snapshot.ingestion.lastLog.inserted} />
              <Row label="Fetched" value={snapshot.ingestion.lastLog.total_fetched} />
              <Row label="Duration ms" value={snapshot.ingestion.lastLog.duration_ms} />
              <Row label="At" value={snapshot.ingestion.lastLog.created_at} />
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  ok,
}: {
  label: string;
  value: string | number | null | undefined;
  ok?: boolean;
}) {
  const display = value == null ? "—" : String(value);
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span
        className={
          ok === true
            ? "font-mono text-emerald-400"
            : ok === false
              ? "font-mono text-red-400"
              : "font-mono text-zinc-300"
        }
      >
        {display}
      </span>
    </div>
  );
}

function FlagRow({ label, ok }: { label: string; ok: boolean }) {
  return <Row label={label} value={ok ? "enabled" : "disabled"} ok={ok} />;
}

function ArticleList({
  items,
}: {
  items: Array<{ id: string; primary: string; meta: string }>;
}) {
  if (!items.length) {
    return <p className="text-sm text-zinc-500">No rows yet</p>;
  }
  return (
    <ul className="space-y-2 border-t border-zinc-800 pt-4">
      {items.map((item) => (
        <li key={item.id} className="text-sm">
          <p className="text-zinc-200">{item.primary}</p>
          <p className="font-mono text-xs text-zinc-500">{item.meta}</p>
        </li>
      ))}
    </ul>
  );
}
