"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { deriveCanonicalHealth } from "@/lib/admin-v3/canonical-health";
import {
  Av3Hero,
  Av3Metric,
  Av3MetricGrid,
  Av3Panel,
  Av3ReasonList,
  Av3SkeletonGrid,
  Av3Stack,
  Av3StatusBadge,
} from "@/components/admin-v3";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function money(v: unknown): string {
  const r = asRecord(v);
  if (typeof r.display === "string") return r.display;
  if (typeof r.usdLabel === "string") return r.usdLabel;
  if (typeof r.inr === "number") return `₹${r.inr.toLocaleString("en-IN")}`;
  if (typeof r.usd === "number") return `$${r.usd.toFixed(2)}`;
  return "—";
}

export function CommandCentre() {
  const { data, loading, error } = useAdminNewsroom();
  const [costToday, setCostToday] = useState<string>("—");
  const [costAvailable, setCostAvailable] = useState(false);
  const [healthSnapshot, setHealthSnapshot] = useState<
    ReturnType<typeof deriveCanonicalHealth> | null
  >(null);

  const generated = useMemo(
    () => (Array.isArray(data?.generatedArticles) ? data.generatedArticles : []),
    [data]
  );

  const publishedToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return generated.filter((a) => {
      if (!a.published_at || a.editorial_status === "rejected") return false;
      return new Date(a.published_at).getTime() >= start.getTime();
    }).length;
  }, [generated]);

  const pending = useMemo(
    () => generated.filter((a) => a.editorial_status === "pending").length,
    [generated]
  );

  const queueDepth = useMemo(() => {
    const q = Array.isArray(data?.aiQueue) ? data.aiQueue : [];
    return q.length;
  }, [data]);

  const failedQueue = useMemo(() => {
    const q = Array.isArray(data?.aiQueue) ? data.aiQueue : [];
    return q.filter((item) => Boolean(item.error)).length;
  }, [data]);

  const ingestionFailures = useMemo(() => {
    const f = data?.ingestion?.recentFailures;
    return Array.isArray(f) ? f.length : 0;
  }, [data]);

  useEffect(() => {
    let cancelled = false;

    async function loadExtras() {
      const [execRes, healthRes] = await Promise.allSettled([
        fetch("/api/admin/ops/executive", { credentials: "include" }),
        fetch("/api/admin/ops/health", { credentials: "include" }),
      ]);
      if (cancelled) return;

      if (execRes.status === "fulfilled" && execRes.value.ok) {
        try {
          const json = await execRes.value.json();
          const overview = asRecord(asRecord(json.dashboard).overview);
          const spend = overview.todaySpend;
          setCostToday(money(spend));
          setCostAvailable(Boolean(spend));
        } catch {
          /* keep placeholder */
        }
      }

      if (healthRes.status === "fulfilled" && healthRes.value.ok) {
        try {
          const json = await healthRes.value.json();
          setHealthSnapshot(deriveCanonicalHealth(json));
        } catch {
          /* keep placeholder */
        }
      }
    }

    void loadExtras();
    return () => {
      cancelled = true;
    };
  }, []);

  const attention = useMemo(() => {
    const items: Array<{ label: string; href: string; count: number }> = [];
    if (pending > 0) {
      items.push({ label: "Stories waiting for review", href: "/admin/stories", count: pending });
    }
    if (failedQueue > 0) {
      items.push({ label: "AI queue failures", href: "/admin/system", count: failedQueue });
    }
    if (queueDepth > 20) {
      items.push({ label: "Queue backlog", href: "/admin/technical", count: queueDepth });
    }
    if (ingestionFailures > 0) {
      items.push({
        label: "Ingestion failures",
        href: "/admin/ingestion",
        count: ingestionFailures,
      });
    }
    return items;
  }, [pending, failedQueue, queueDepth, ingestionFailures]);

  const attentionTotal = attention.reduce((n, i) => n + i.count, 0);
  const healthReasons = healthSnapshot?.reasons ?? [];

  if (loading && !data) {
    return (
      <Av3Stack>
        <Av3SkeletonGrid count={5} />
      </Av3Stack>
    );
  }

  if (error && !data) {
    return (
      <Av3Panel title="Command centre unavailable">
        <p className="av3-note">{error}</p>
      </Av3Panel>
    );
  }

  return (
    <Av3Stack>
      <Av3Hero
        tone={healthSnapshot?.state ?? "unknown"}
        badge={
          healthSnapshot ? (
            <Av3StatusBadge tone={healthSnapshot.state} label={healthSnapshot.label} />
          ) : (
            <Av3StatusBadge tone="unknown" label="Checking platform" />
          )
        }
        title={`${publishedToday} published today · ${pending} awaiting review · ${attentionTotal} alerts`}
        meta={
          data?.fetchedAt ? (
            <>
              Editorial snapshot <ClientTime iso={data.fetchedAt} preset="time" />
            </>
          ) : undefined
        }
        action={
          <Link href="/admin/stories" className="anr-btn anr-btn--primary">
            Review stories
          </Link>
        }
      />

      {healthReasons.length > 0 ? <Av3ReasonList reasons={healthReasons} /> : null}

      <Av3MetricGrid>
        <Av3Metric label="Published today" value={publishedToday} hint="Live on site" />
        <Av3Metric label="Awaiting review" value={pending} hint="Editorial queue" />
        <Av3Metric label="Needs attention" value={attentionTotal} hint="Editorial + pipeline" />
        <Av3Metric label="Pipeline queue" value={queueDepth} hint="AI jobs waiting" />
        <Av3Metric
          label="AI spend today"
          value={costToday}
          hint={
            costAvailable ? (
              "Executive cost dashboard"
            ) : (
              <>
                Cost data unavailable{" "}
                <Link href="/admin/executive" className="anr-text-link">
                  Open setup (Executive costs)
                </Link>
              </>
            )
          }
        />
      </Av3MetricGrid>

      <Av3Panel title="Needs attention now" subtitle="Actionable editorial and ops items">
        {attention.length === 0 && healthReasons.length === 0 ? (
          <p className="av3-note">Nothing urgent in the editorial snapshot.</p>
        ) : (
          <ul className="anr-dense-list">
            {attention.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
                <em>{item.count}</em>
              </li>
            ))}
            {healthReasons.slice(0, 4).map((reason) => (
              <li key={reason.id}>
                <Link href={reason.href}>{reason.title}</Link>
                <em>{reason.severity}</em>
              </li>
            ))}
          </ul>
        )}
      </Av3Panel>
    </Av3Stack>
  );
}
