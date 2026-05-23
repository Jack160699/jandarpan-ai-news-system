import {
  fetchLatestNews,
  getSupabaseEnvDiagnostics,
  isSupabaseConfigured,
  createAnonServerClient,
} from "@/lib/supabase";
import { getServerAuthSession } from "@/lib/supabase/auth";
import { getServerEnvSummary, validateEnvNaming } from "@/utils/env";

export const dynamic = "force-dynamic";

export default async function SupabaseDebugPage() {
  const envDiag = getSupabaseEnvDiagnostics();
  const envSummary = getServerEnvSummary();
  const envWarnings = validateEnvNaming();
  const configured = isSupabaseConfigured();

  let connectivity: { ok: boolean; count: number | null; error: string | null } = {
    ok: false,
    count: null,
    error: configured ? null : "not_configured",
  };

  if (configured) {
    try {
      const supabase = createAnonServerClient();
      const { count, error } = await supabase
        .from("news_articles")
        .select("id", { count: "exact", head: true });
      connectivity = {
        ok: !error,
        count: count ?? null,
        error: error?.message ?? null,
      };
    } catch (e) {
      connectivity = {
        ok: false,
        count: null,
        error: e instanceof Error ? e.message : "connectivity_failed",
      };
    }
  }

  const latest = configured
    ? await fetchLatestNews({ page: 1, pageSize: 5 })
    : { data: [], error: "not_configured", total: null, page: 1, pageSize: 5, hasMore: false };

  const auth = configured
    ? await getServerAuthSession()
    : { user: null, session: null, error: "not_configured" };

  return (
    <main className="min-h-screen bg-[#0c0c0e] text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-500/90">
          Diagnostics
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          Supabase connection
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Temporary page for production verification. Remove or protect before public launch.
        </p>

        <section className="mt-10 space-y-6">
          <Card title="Environment">
            <Row label="Configured" value={configured ? "yes" : "no"} ok={configured} />
            <Row label="URL host" value={envDiag.urlHostname ?? "—"} ok={envDiag.urlValid} />
            <Row label="Anon key length" value={String(envDiag.anonKeyLength)} ok={envDiag.hasAnon} />
            <Row
              label="Service role (server)"
              value={envSummary.supabaseAdmin ? "present" : "missing"}
              ok={envSummary.supabaseAdmin}
            />
            {envDiag.warnings.map((w) => (
              <p key={w} className="mt-2 text-xs text-amber-400/90">
                {w}
              </p>
            ))}
            {envWarnings.map((w) => (
              <p key={w} className="mt-2 text-xs text-red-400/90">
                {w}
              </p>
            ))}
          </Card>

          <Card title="Database">
            <Row
              label="Anon read"
              value={connectivity.ok ? `ok (${connectivity.count ?? 0} rows)` : connectivity.error ?? "failed"}
              ok={connectivity.ok}
            />
            <Row
              label="Latest fetch"
              value={
                latest.error
                  ? latest.error
                  : `${latest.data.length} articles (total ${latest.total ?? "?"})`
              }
              ok={!latest.error && latest.data.length > 0}
            />
            {latest.data.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
                {latest.data.map((a) => (
                  <li key={a.id} className="text-sm text-zinc-300">
                    <span className="text-zinc-500">{a.category}</span> — {a.title}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Auth">
            <Row
              label="Session"
              value={auth.user ? auth.user.email ?? auth.user.id : "signed out"}
              ok={Boolean(auth.user)}
            />
            {auth.error && (
              <p className="mt-2 text-xs text-zinc-500">{auth.error}</p>
            )}
          </Card>
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
  value: string;
  ok?: boolean;
}) {
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
        {value}
      </span>
    </div>
  );
}
