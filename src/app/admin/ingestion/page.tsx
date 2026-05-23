/**
 * Internal ingestion dashboard — protect with ADMIN_SECRET (or CRON_SECRET)
 * Access: /admin/ingestion?key=YOUR_ADMIN_SECRET
 */

import { isAdminAuthorized } from "@/lib/editorial-dashboard/auth";
import { getAdminIngestionStats } from "@/lib/news/admin-stats";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string }>;
};

export default async function AdminIngestionPage({ searchParams }: PageProps) {
  const { key } = await searchParams;

  if (!isAdminAuthorized(key)) {
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-neutral-200">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Add <code className="text-amber-400">?key=ADMIN_SECRET</code> or set{" "}
          <code className="text-amber-400">ADMIN_SECRET</code> in Vercel.
        </p>
      </main>
    );
  }

  const stats = await getAdminIngestionStats();

  if (!stats) {
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-neutral-200">
        <p>Supabase not configured.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100 md:p-10">
      <header className="mb-8 border-b border-neutral-800 pb-6">
        <p className="text-xs uppercase tracking-widest text-amber-500">
          Internal · Ingestion
        </p>
        <h1 className="mt-1 text-2xl font-semibold">News Pipeline Dashboard</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Last fetch: {stats.lastFetchAt ?? "—"} · Articles: {stats.articleCount}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard title="Total articles" value={String(stats.articleCount)} />
        <StatCard
          title="Categories"
          value={String(Object.keys(stats.categoryCounts).length)}
        />
        <StatCard
          title="Providers"
          value={String(Object.keys(stats.providerCounts).length)}
        />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
          Category analytics
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.categoryCounts).map(([cat, count]) => (
            <span
              key={cat}
              className="rounded bg-neutral-900 px-3 py-1 text-sm"
            >
              {cat}: {count}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
          Provider breakdown
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.providerCounts).map(([p, count]) => (
            <span
              key={p}
              className="rounded bg-neutral-900 px-3 py-1 text-sm"
            >
              {p}: {count}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
            Ingestion logs
          </h2>
          <ul className="space-y-2 text-sm">
            {stats.recentLogs.map((log) => (
              <li
                key={log.id}
                className="rounded border border-neutral-800 bg-neutral-900/50 p-3"
              >
                <span className="text-amber-400">{log.status}</span> · inserted{" "}
                {log.inserted}/{log.total_fetched} · {log.duration_ms ?? "—"}ms
                <br />
                <span className="text-neutral-500 text-xs">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
            Failed sources / validation
          </h2>
          <ul className="space-y-2 text-sm">
            {stats.recentFailures.length === 0 ? (
              <li className="text-neutral-500">No recent failures</li>
            ) : (
              stats.recentFailures.map((f) => (
                <li
                  key={f.id}
                  className="rounded border border-red-900/40 bg-red-950/20 p-3"
                >
                  {f.title ?? "—"} · {f.provider ?? "unknown"}
                  <br />
                  <span className="text-red-300/80 text-xs">{f.reason}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
          Latest articles
        </h2>
        <ul className="space-y-2 text-sm">
          {stats.latestArticles.map((a) => (
            <li key={a.id} className="border-b border-neutral-800 py-2">
              <span className="text-neutral-500">{a.provider ?? "—"}</span> ·{" "}
              {a.category} — {a.title}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
