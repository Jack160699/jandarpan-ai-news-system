"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { IntelligenceDeepLinkNav } from "@/components/admin-newsroom/IntelligenceDeepLinkNav";
import { buildExecutiveDigest } from "@/lib/admin/executive-digest";
import {
  buildDigestDeepLinks,
  buildInsightDeepLinksForRanked,
  buildOpportunityDeepLinks,
  WORKFLOW_DIGEST_DEEP_LINKS,
} from "@/lib/admin/intelligence-deep-links";
import { useIntelligenceCenterData } from "@/hooks/use-intelligence-center-data";
import type { CoverageInsightRankedItem } from "@/lib/newsroom-health/build-coverage-insights";
import type { CoverageOpportunityItem } from "@/lib/newsroom-health/build-coverage-opportunities";
import type {
  ExecutiveDigestKpi,
  ExecutiveDigestLaunchItem,
  ExecutiveDigestRecommendation,
} from "@/lib/admin/executive-digest";

function DigestKpiList({
  title,
  items,
}: {
  title: string;
  items: ExecutiveDigestKpi[];
}) {
  if (!items.length) return null;

  return (
    <section className="anr-executive-digest__section" aria-labelledby={`digest-${title}`}>
      <h2 id={`digest-${title}`} className="anr-executive-digest__section-title">
        {title}
      </h2>
      <dl className="anr-executive-digest__kpi-list">
        {items.map((item) => (
          <div key={`${title}-${item.label}`} className="anr-executive-digest__kpi">
            <dt>{item.label}</dt>
            <dd>
              <strong>{item.value}</strong>
              {item.detail ? <span className="anr-meta">{item.detail}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DigestRankedList({
  title,
  items,
}: {
  title: string;
  items: CoverageInsightRankedItem[];
}) {
  if (!items.length) return null;

  return (
    <section className="anr-executive-digest__section" aria-labelledby={`digest-${title}`}>
      <h2 id={`digest-${title}`} className="anr-executive-digest__section-title">
        {title}
      </h2>
      <ol className="anr-executive-digest__ranked-list">
        {items.map((item) => (
          <li key={`${title}-${item.label}`}>
            <span>{item.label}</span>
            <strong>{item.count}</strong>
            <IntelligenceDeepLinkNav
              links={buildInsightDeepLinksForRanked(title, item)}
              label={`Deep links for ${item.label}`}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function DigestOpportunityList({
  title,
  items,
}: {
  title: string;
  items: CoverageOpportunityItem[];
}) {
  if (!items.length) return null;

  return (
    <section className="anr-executive-digest__section" aria-labelledby={`digest-${title}`}>
      <h2 id={`digest-${title}`} className="anr-executive-digest__section-title">
        {title}
      </h2>
      <ol className="anr-executive-digest__opportunity-list">
        {items.map((item) => (
          <li key={item.id} className="anr-executive-digest__opportunity">
            <div className="anr-executive-digest__opportunity-head">
              <h3>{item.title}</h3>
              <span className={`anr-coverage-opportunity__severity anr-coverage-opportunity__severity--${item.severity}`}>
                {item.severity}
              </span>
            </div>
            <p>{item.reason}</p>
            <dl className="anr-executive-digest__metrics">
              {item.metrics.map((metric) => (
                <div key={`${item.id}-${metric.label}`}>
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                </div>
              ))}
            </dl>
            <IntelligenceDeepLinkNav
              links={buildOpportunityDeepLinks(item)}
              label={`Deep links for ${item.title}`}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function DigestRecommendations({
  items,
}: {
  items: ExecutiveDigestRecommendation[];
}) {
  if (!items.length) return null;

  return (
    <section
      className="anr-executive-digest__section"
      aria-labelledby="digest-recommendations"
    >
      <h2 id="digest-recommendations" className="anr-executive-digest__section-title">
        Key recommendations
      </h2>
      <ol className="anr-executive-digest__recommendation-list">
        {items.map((item) => (
          <li key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.action}</p>
              <p className="anr-meta">
                Severity: {item.severity} · Desk route: {item.route}
              </p>
              <IntelligenceDeepLinkNav
                links={buildDigestDeepLinks({ type: "recommendation", recommendation: item })}
                label={`Deep links for ${item.title}`}
              />
          </li>
        ))}
      </ol>
    </section>
  );
}

function DigestLaunchSummary({ items }: { items: ExecutiveDigestLaunchItem[] }) {
  if (!items.length) return null;

  return (
    <section
      className="anr-executive-digest__section"
      aria-labelledby="digest-launch-summary"
    >
      <h2 id="digest-launch-summary" className="anr-executive-digest__section-title">
        Launch summary
      </h2>
      <dl className="anr-executive-digest__kpi-list">
        {items.map((item) => (
          <div key={item.label} className="anr-executive-digest__kpi">
            <dt>{item.label}</dt>
            <dd>
              <strong>{item.status}</strong>
              <span className="anr-meta">{item.detail}</span>
              <IntelligenceDeepLinkNav
                links={buildDigestDeepLinks({ type: "launch", label: item.label })}
                label={`Deep links for ${item.label}`}
              />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ExecutiveDigestReport() {
  const { center, loading, error } = useIntelligenceCenterData();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const digest = useMemo(() => buildExecutiveDigest(center), [center]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(digest.plainText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [digest.plainText]);

  if (loading) {
    return <p className="anr-meta">Preparing executive digest…</p>;
  }

  if (error) {
    return <EmptyState title="Executive digest unavailable" hint={error} />;
  }

  if (!digest.hasLayer) {
    return (
      <EmptyState
        title="No digest data"
        hint="Intelligence center metadata is not available for export yet."
      />
    );
  }

  return (
    <div className="anr-executive-digest">
      <div className="anr-executive-digest__toolbar" aria-label="Digest export tools">
        <button type="button" className="anr-btn" onClick={handlePrint}>
          Print report
        </button>
        <button type="button" className="anr-btn anr-btn--ghost" onClick={handleCopy}>
          {copyState === "copied"
            ? "Copied"
            : copyState === "failed"
              ? "Copy failed"
              : "Copy report"}
        </button>
        <Link href="/admin/intelligence" className="anr-btn anr-btn--ghost">
          Back to intelligence center
        </Link>
      </div>

      <article
        className="anr-executive-digest__report"
        aria-label="Executive intelligence digest report"
      >
        <header className="anr-executive-digest__header">
          <p className="anr-executive-digest__eyebrow">Executive intelligence digest</p>
          <h1 className="anr-executive-digest__title">{digest.title}</h1>
          <p className="anr-executive-digest__meta">
            Generated <ClientTime iso={digest.generatedAt} preset="datetime" />
          </p>
        </header>

        <section
          className="anr-executive-digest__section"
          aria-labelledby="digest-executive-summary"
        >
          <h2 id="digest-executive-summary" className="anr-executive-digest__section-title">
            Executive summary
          </h2>
          <dl className="anr-executive-digest__summary-grid">
            <div>
              <dt>Overall status</dt>
              <dd>{digest.executiveSummary.overallLabel}</dd>
            </div>
            <div>
              <dt>Health state</dt>
              <dd>{digest.executiveSummary.overallStatus}</dd>
            </div>
            <div>
              <dt>Articles in snapshot</dt>
              <dd>{digest.executiveSummary.sampleSize}</dd>
            </div>
            <div>
              <dt>Opportunities</dt>
              <dd>
                {digest.executiveSummary.opportunityCount} (
                {digest.executiveSummary.highPriorityCount} high priority)
              </dd>
            </div>
            {digest.executiveSummary.queueHealth ? (
              <div className="anr-executive-digest__full-row">
                <dt>Queue health</dt>
                <dd>{digest.executiveSummary.queueHealth}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section
          className="anr-executive-digest__section"
          aria-labelledby="digest-newsroom-health"
        >
          <h2 id="digest-newsroom-health" className="anr-executive-digest__section-title">
            Overall newsroom health
          </h2>
          <p className="anr-executive-digest__lead">
            {digest.newsroomHealth.overallLabel} ({digest.newsroomHealth.overallStatus})
          </p>
          <DigestKpiList title="Health indicators" items={digest.newsroomHealth.indicators} />
        </section>

        <DigestKpiList title="Top KPIs" items={digest.topKpis} />
        <DigestKpiList title="Top coverage insights" items={digest.topCoverageInsights} />
        <DigestOpportunityList title="Top opportunities" items={digest.topOpportunities} />

        <section
          className="anr-executive-digest__section"
          aria-labelledby="digest-workflow-summary"
        >
          <h2 id="digest-workflow-summary" className="anr-executive-digest__section-title">
            Workflow summary
          </h2>
          <dl className="anr-executive-digest__summary-grid">
            <div>
              <dt>Total in workflow</dt>
              <dd>{digest.workflowSummary.total}</dd>
            </div>
            <div>
              <dt>Pending review</dt>
              <dd>{digest.workflowSummary.pendingReview}</dd>
            </div>
            <div>
              <dt>Overdue</dt>
              <dd>{digest.workflowSummary.overdue}</dd>
            </div>
            <div>
              <dt>Published today</dt>
              <dd>{digest.workflowSummary.publishedToday}</dd>
            </div>
          </dl>
          <IntelligenceDeepLinkNav
            links={WORKFLOW_DIGEST_DEEP_LINKS}
            label="Workflow deep links"
          />
          <DigestRankedList
            title="Workflow stages"
            items={digest.workflowSummary.byStage}
          />
        </section>

        <DigestLaunchSummary items={digest.launchSummary} />
        <DigestRankedList title="Top active events" items={digest.topActiveEvents} />
        <DigestRankedList title="Top districts" items={digest.topDistricts} />
        <DigestRankedList title="Top categories" items={digest.topCategories} />
        <DigestRecommendations items={digest.recommendations} />

        <footer className="anr-executive-digest__footer">
          <p className="anr-meta">
            Read-only digest projected from Intelligence Center metadata. No AI
            generation. Suitable for print and copy export.
          </p>
        </footer>
      </article>
    </div>
  );
}
