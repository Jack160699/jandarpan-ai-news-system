import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { getAdminIngestionStats } from "@/lib/news/admin-stats";

export const dynamic = "force-dynamic";

export default async function AdminIngestionPage() {
  const stats = await getAdminIngestionStats();

  return (
    <AdminPageGate permission="monitoring:read">
      <AdminShell
        title="Ingestion pipeline"
        subtitle="Internal news pipeline health and provider breakdown."
      >
        {!stats ? (
          <p className="anr-meta">Supabase not configured.</p>
        ) : (
          <IngestionDashboard stats={stats} />
        )}
      </AdminShell>
    </AdminPageGate>
  );
}

type IngestionStats = NonNullable<Awaited<ReturnType<typeof getAdminIngestionStats>>>;

function IngestionDashboard({ stats }: { stats: IngestionStats }) {
  return (
    <div className="anr-ingestion">
      <p className="anr-meta">
        Last fetch: {stats.lastFetchAt ?? "—"} · Articles: {stats.articleCount}
      </p>

      <div className="anr-ingestion__grid">
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

      <section>
        <h2>Category analytics</h2>
        <div className="anr-ingestion__tags">
          {Object.entries(stats.categoryCounts).map(([cat, count]) => (
            <span key={cat}>
              {cat}: {count}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2>Provider breakdown</h2>
        <div className="anr-ingestion__tags">
          {Object.entries(stats.providerCounts).map(([p, count]) => (
            <span key={p}>
              {p}: {count}
            </span>
          ))}
        </div>
      </section>

      <section className="anr-ingestion__split">
        <div>
          <h2>Ingestion logs</h2>
          <ul>
            {stats.recentLogs.map((log) => (
              <li key={log.id}>
                <span>{log.status}</span> · inserted {log.inserted}/{log.total_fetched}{" "}
                · {log.duration_ms ?? "—"}ms
                <br />
                <span>{new Date(log.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Failed sources / validation</h2>
          <ul>
            {stats.recentFailures.length === 0 ? (
              <li>No recent failures</li>
            ) : (
              stats.recentFailures.map((f) => (
                <li key={f.id}>
                  {f.title ?? "—"} · {f.provider ?? "unknown"}
                  <br />
                  <span>{f.reason}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section>
        <h2>Latest articles</h2>
        <ul>
          {stats.latestArticles.map((a) => (
            <li key={a.id}>
              <span>{a.provider ?? "—"}</span> · {a.category} — {a.title}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="anr-ingestion__stat">
      <p>{title}</p>
      <p>{value}</p>
    </div>
  );
}
