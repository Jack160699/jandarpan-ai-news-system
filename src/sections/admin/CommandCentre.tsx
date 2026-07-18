"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";

type DetailKey = "publishing" | "attention" | "traffic" | "costs" | null;

function StatusPill({
  tone,
  label,
}: {
  tone: "ok" | "warn" | "bad" | "neutral";
  label: string;
}) {
  return <span className={`anr-cc-pill anr-cc-pill--${tone}`}>{label}</span>;
}

export function CommandCentre() {
  const { data, loading, error } = useAdminNewsroom();
  const [openDetail, setOpenDetail] = useState<DetailKey>(null);

  const generated = useMemo(
    () => (Array.isArray(data?.generatedArticles) ? data.generatedArticles : []),
    [data]
  );

  const publishedToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return generated.filter((a) => {
      if (!a.published_at) return false;
      if (a.editorial_status === "rejected") return false;
      return new Date(a.published_at).getTime() >= start.getTime();
    }).length;
  }, [generated]);

  const pending = useMemo(
    () => generated.filter((a) => a.editorial_status === "pending").length,
    [generated]
  );
  const failed = useMemo(() => {
    const q = Array.isArray(data?.aiQueue) ? data.aiQueue : [];
    return q.filter((item) => Boolean(item.error)).length;
  }, [data]);

  const queueDepth = useMemo(() => {
    const q = Array.isArray(data?.aiQueue) ? data.aiQueue : [];
    return q.length;
  }, [data]);

  const ingestionFailures = useMemo(() => {
    const f = data?.ingestion?.recentFailures;
    return Array.isArray(f) ? f.length : 0;
  }, [data]);

  const platformHealthy = failed === 0 && ingestionFailures === 0 && queueDepth < 50;

  const healthSummary = platformHealthy
    ? `Publishing is healthy. ${publishedToday} ${publishedToday === 1 ? "story was" : "stories were"} published today.`
    : `Attention needed. ${failed + ingestionFailures} issue${failed + ingestionFailures === 1 ? "" : "s"} require review.`;

  const attentionItems = useMemo(() => {
    const items: Array<{ label: string; href: string; count: number }> = [];
    if (pending > 0) {
      items.push({ label: "Stories waiting for review", href: "/admin/stories", count: pending });
    }
    if (failed > 0) {
      items.push({ label: "Failed stories", href: "/admin/stories?status=failed", count: failed });
    }
    if (queueDepth > 20) {
      items.push({ label: "AI queue backlog", href: "/admin/technical", count: queueDepth });
    }
    if (ingestionFailures > 0) {
      items.push({
        label: "Recent ingestion failures",
        href: "/admin/ingestion",
        count: ingestionFailures,
      });
    }
    return items;
  }, [pending, failed, queueDepth, ingestionFailures]);

  function toggle(key: Exclude<DetailKey, null>) {
    setOpenDetail((prev) => (prev === key ? null : key));
  }

  if (loading && !data) {
    return (
      <div className="anr-cc" aria-busy="true">
        <div className="anr-cc-skeleton" />
        <div className="anr-cc-skeleton" />
        <div className="anr-cc-skeleton" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <EmptyState
        title="Command centre unavailable"
        description={error}
      />
    );
  }

  return (
    <div className="anr-cc">
      <section className="anr-cc-hero" aria-labelledby="cc-health-title">
        <div className="anr-cc-hero__row">
          <div>
            <p className="anr-meta">Platform status</p>
            <h2 id="cc-health-title" className="anr-cc-hero__title">
              {platformHealthy ? "Operating normally" : "Needs attention"}
            </h2>
            <p className="anr-cc-hero__summary">{healthSummary}</p>
          </div>
          <StatusPill
            tone={platformHealthy ? "ok" : "warn"}
            label={platformHealthy ? "Healthy" : "Review"}
          />
        </div>
        {data?.fetchedAt ? (
          <p className="anr-meta">
            As of <ClientTime iso={data.fetchedAt} preset="time" />
          </p>
        ) : null}
      </section>

      <section className="anr-cc-grid" aria-label="Key metrics">
        <article className="anr-cc-card">
          <p className="anr-meta">Published today</p>
          <strong>{publishedToday}</strong>
          <p className="anr-cc-card__ctx">Stories live on the site</p>
          <button type="button" className="anr-cc-link" onClick={() => toggle("publishing")}>
            {openDetail === "publishing" ? "Hide details" : "View details"}
            {openDetail === "publishing" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {openDetail === "publishing" ? (
            <div className="anr-cc-detail">
              <p>Pending review: {pending}</p>
              <p>AI queue depth: {queueDepth}</p>
              <Link href="/admin/articles">Open published stories →</Link>
            </div>
          ) : null}
        </article>

        <article className="anr-cc-card">
          <p className="anr-meta">Needs attention</p>
          <strong>{attentionItems.reduce((n, i) => n + i.count, 0)}</strong>
          <p className="anr-cc-card__ctx">
            {attentionItems.length === 0
              ? "Nothing urgent right now"
              : `${attentionItems.length} area${attentionItems.length === 1 ? "" : "s"} to review`}
          </p>
          <button type="button" className="anr-cc-link" onClick={() => toggle("attention")}>
            {openDetail === "attention" ? "Hide details" : "See more"}
            {openDetail === "attention" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {openDetail === "attention" ? (
            <ul className="anr-cc-detail">
              {attentionItems.length === 0 ? (
                <li>All clear.</li>
              ) : (
                attentionItems.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>
                      {item.label} ({item.count})
                    </Link>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </article>

        <article className="anr-cc-card">
          <p className="anr-meta">Traffic & SEO</p>
          <strong>—</strong>
          <p className="anr-cc-card__ctx">Open Business workspace for live metrics</p>
          <Link href="/admin/business" className="anr-cc-link">
            View details <ChevronRight size={14} />
          </Link>
        </article>

        <article className="anr-cc-card">
          <p className="anr-meta">AI cost</p>
          <strong>—</strong>
          <p className="anr-cc-card__ctx">Spend and forecasts in Costs & AI spend</p>
          <Link href="/admin/executive" className="anr-cc-link">
            View details <ChevronRight size={14} />
          </Link>
        </article>
      </section>

      <section className="anr-cc-actions" aria-label="Recommended actions">
        <h3>Recommended actions</h3>
        <ul>
          {attentionItems.slice(0, 3).map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
          {attentionItems.length === 0 ? (
            <>
              <li>
                <Link href="/admin/editorial">Review editorial home</Link>
              </li>
              <li>
                <Link href="/admin/business">Check SEO & traffic</Link>
              </li>
              <li>
                <Link href="/admin/technical">Confirm system health</Link>
              </li>
            </>
          ) : null}
        </ul>
      </section>

      <section className="anr-cc-quick" aria-label="Quick actions">
        <h3>Quick actions</h3>
        <div className="anr-cc-quick__row">
          <Link href="/admin/stories" className="anr-btn anr-btn--primary">
            Review stories
          </Link>
          <Link href="/admin/live-wire" className="anr-btn anr-btn--ghost">
            Breaking news
          </Link>
          <Link href="/admin/technical" className="anr-btn anr-btn--ghost">
            System health
          </Link>
          <Link href="/admin/executive" className="anr-btn anr-btn--ghost">
            AI spend
          </Link>
        </div>
      </section>
    </div>
  );
}
