"use client";

import Link from "next/link";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { CoverageInsightsPanel } from "@/components/admin-newsroom/CoverageInsightsPanel";
import { CoverageOpportunityPanel } from "@/components/admin-newsroom/CoverageOpportunityPanel";
import { LaunchHealthSummaryStrip } from "@/components/admin-newsroom/LaunchHealthSummaryStrip";
import { NewsroomHealthStrip } from "@/components/admin-newsroom/NewsroomHealthStrip";
import { IntelligenceDeepLinkNav } from "@/components/admin-newsroom/IntelligenceDeepLinkNav";
import { WORKFLOW_DIGEST_DEEP_LINKS } from "@/lib/admin/intelligence-deep-links";
import type { IntelligenceCenterVm } from "@/lib/admin/intelligence-center";
import { useIntelligenceCenterData } from "@/hooks/use-intelligence-center-data";
import type { CoverageInsightRankedItem } from "@/lib/newsroom-health/build-coverage-insights";
import type { CoverageOpportunityItem } from "@/lib/newsroom-health/build-coverage-opportunities";

function RankedHighlightList({
  title,
  items,
}: {
  title: string;
  items: CoverageInsightRankedItem[];
}) {
  if (!items.length) return null;

  return (
    <section className="anr-intel-center__highlight" aria-label={title}>
      <h4 className="anr-coverage-insights__list-title">{title}</h4>
      <ol className="anr-coverage-insights__ranked-list">
        {items.map((item) => (
          <li key={`${title}-${item.label}`}>
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}

function HighPriorityOpportunityList({
  items,
}: {
  items: CoverageOpportunityItem[];
}) {
  if (!items.length) return null;

  return (
    <AdminCard
      title="High-priority opportunities"
      description="Opportunities with high severity from existing newsroom metadata"
    >
      <section aria-label="High-priority coverage opportunities">
        <ol className="anr-coverage-opportunity__list">
          {items.map((item) => (
            <li key={item.id} className="anr-coverage-opportunity__item">
              <div className="anr-coverage-opportunity__item-head">
                <h4 className="anr-coverage-opportunity__title">{item.title}</h4>
                <span
                  className="anr-coverage-opportunity__severity anr-coverage-opportunity__severity--high"
                  aria-label="High priority"
                >
                  high
                </span>
              </div>
              <p className="anr-coverage-opportunity__reason">{item.reason}</p>
              <dl className="anr-coverage-opportunity__metrics">
                {item.metrics.map((metric) => (
                  <div key={`${item.id}-${metric.label}`}>
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="anr-coverage-opportunity__action">
                <span className="anr-meta">Recommended: </span>
                {item.recommendedAction}
              </p>
              <p className="anr-meta text-xs">Desk route: {item.route}</p>
            </li>
          ))}
        </ol>
      </section>
    </AdminCard>
  );
}

function IntelligenceCenterSummaryStrip({ vm }: { vm: IntelligenceCenterVm }) {
  return (
    <header
      className="anr-intel-center__summary"
      aria-label="Intelligence center executive summary"
    >
      <div className="anr-intel-center__summary-main">
        <p className="anr-intel-center__eyebrow">Executive overview</p>
        <h2 className="anr-intel-center__headline">{vm.summary.overallLabel}</h2>
        <p className="anr-meta">
          Snapshot of {vm.summary.sampleSize} articles ·{" "}
          {vm.summary.opportunityCount} opportunities ·{" "}
          {vm.summary.highPriorityCount} high priority
        </p>
        <p className="anr-meta mt-2">
          <Link href="/admin/intelligence/digest" className="anr-intel-inspector__action-link">
            Open executive digest report
          </Link>
        </p>
      </div>
      <dl className="anr-intel-center__summary-stats">
        <div>
          <dt>Status</dt>
          <dd>{vm.summary.overallStatus}</dd>
        </div>
        <div>
          <dt>Published today</dt>
          <dd>{vm.workflow.publishedToday}</dd>
        </div>
        <div>
          <dt>Awaiting review</dt>
          <dd>{vm.workflow.pendingReview}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>
            <ClientTime iso={vm.fetchedAt} preset="datetime" />
          </dd>
        </div>
      </dl>
    </header>
  );
}

function WorkflowSummarySection({ vm }: { vm: IntelligenceCenterVm }) {
  if (!vm.workflow.hasLayer) return null;

  return (
    <AdminCard
      title="Workflow summary"
      description="Read-only workflow analytics from the editorial snapshot"
    >
      <section aria-label="Workflow summary">
        <dl className="anr-intel-center__workflow-kpis">
          <div>
            <dt>Total in workflow</dt>
            <dd>{vm.workflow.total}</dd>
          </div>
          <div>
            <dt>Pending review</dt>
            <dd>{vm.workflow.pendingReview}</dd>
          </div>
          <div>
            <dt>Overdue</dt>
            <dd>{vm.workflow.overdue}</dd>
          </div>
          <div>
            <dt>Published today</dt>
            <dd>{vm.workflow.publishedToday}</dd>
          </div>
        </dl>
        {vm.workflow.byStage.length ? (
          <RankedHighlightList
            title="Articles by workflow stage"
            items={vm.workflow.byStage}
          />
        ) : null}
        <IntelligenceDeepLinkNav
          links={WORKFLOW_DIGEST_DEEP_LINKS}
          label="Workflow deep links"
        />
      </section>
    </AdminCard>
  );
}

export function IntelligenceCenterExecutivePanel() {
  const { center, loading, error } = useIntelligenceCenterData();

  if (loading) {
    return <p className="anr-meta">Loading intelligence center…</p>;
  }

  if (error) {
    return <EmptyState title="Intelligence center unavailable" hint={error} />;
  }

  if (!center.hasLayer) {
    return (
      <EmptyState
        title="No intelligence data"
        hint="The editorial snapshot has no composable health or coverage layers yet."
      />
    );
  }

  const healthVm = center.health.hasLayer ? center.health : null;
  const coverageVm = center.coverage.hasLayer ? center.coverage : null;
  const opportunitiesVm = center.opportunities.hasLayer
    ? center.opportunities
    : null;

  return (
    <div className="anr-intel-center anr-intel-center--executive">
      <IntelligenceCenterSummaryStrip vm={center} />

      <div className="anr-intel-center__sections">
        {healthVm ? (
          <NewsroomHealthStrip vm={healthVm} showNavigation={false} />
        ) : null}

        {coverageVm ? <CoverageInsightsPanel vm={coverageVm} /> : null}

        <WorkflowSummarySection vm={center} />

        {center.launch.hasLayer ? (
          <LaunchHealthSummaryStrip widgets={center.launch.widgets} />
        ) : null}

        <HighPriorityOpportunityList
          items={center.highlights.highPriorityOpportunities}
        />

        {opportunitiesVm ? (
          <CoverageOpportunityPanel vm={opportunitiesVm} readOnly />
        ) : null}
      </div>
    </div>
  );
}
