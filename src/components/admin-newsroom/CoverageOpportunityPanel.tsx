"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { IntelligenceDeepLinkNav } from "@/components/admin-newsroom/IntelligenceDeepLinkNav";
import { buildOpportunityDeepLinks } from "@/lib/admin/intelligence-deep-links";
import {
  buildCoverageOpportunities,
  type CoverageOpportunityItem,
  type CoverageOpportunitySeverity,
  type CoverageOpportunityVm,
} from "@/lib/newsroom-health/build-coverage-opportunities";
import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";

type CoverageOpportunityPanelProps = {
  vm: CoverageOpportunityVm | null;
  loading?: boolean;
  readOnly?: boolean;
};

const SEVERITY_LABEL: Record<CoverageOpportunitySeverity, string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

function SeverityBadge({ severity }: { severity: CoverageOpportunitySeverity }) {
  return (
    <span
      className={`anr-coverage-opportunity__severity anr-coverage-opportunity__severity--${severity}`}
      aria-label={SEVERITY_LABEL[severity]}
    >
      {severity}
    </span>
  );
}

function OpportunityRow({
  item,
  readOnly = false,
}: {
  item: CoverageOpportunityItem;
  readOnly?: boolean;
}) {
  return (
    <li className="anr-coverage-opportunity__item">
      <div className="anr-coverage-opportunity__item-head">
        <h4 className="anr-coverage-opportunity__title">{item.title}</h4>
        <SeverityBadge severity={item.severity} />
      </div>
      <p className="anr-coverage-opportunity__reason">{item.reason}</p>
      {item.metrics.length ? (
        <dl className="anr-coverage-opportunity__metrics">
          {item.metrics.map((metric) => (
            <div key={`${item.id}-${metric.label}`}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="anr-coverage-opportunity__action">
        <span className="anr-meta">Recommended: </span>
        {item.recommendedAction}
      </p>
      {readOnly ? (
        <p className="anr-meta text-xs">Desk route: {item.route}</p>
      ) : (
        <p className="anr-coverage-opportunity__route">
          <Link href={item.route} className="anr-coverage-opportunity__route-link">
            Open {item.route.replace("/admin/", "").replace(/-/g, " ")} desk
          </Link>
        </p>
      )}
      <IntelligenceDeepLinkNav
        links={buildOpportunityDeepLinks(item)}
        label={`Deep links for ${item.title}`}
      />
    </li>
  );
}

export function CoverageOpportunityPanel({
  vm,
  loading = false,
  readOnly = false,
}: CoverageOpportunityPanelProps) {
  if (loading) {
    return <p className="anr-meta">Loading coverage opportunities…</p>;
  }

  if (!vm?.hasLayer) return null;

  return (
    <AdminCard
      title="Coverage opportunities"
      description={`${vm.opportunityCount} read-only editorial opportunities from newsroom metadata`}
    >
      <section aria-label="Coverage opportunity list">
        <ol className="anr-coverage-opportunity__list">
          {vm.opportunities.map((item) => (
            <OpportunityRow key={item.id} item={item} readOnly={readOnly} />
          ))}
        </ol>
      </section>
    </AdminCard>
  );
}

export function useCoverageOpportunitiesFromEditorial(
  editorial: EditorialDashboardSnapshot | null
): CoverageOpportunityVm | null {
  return useMemo(() => {
    const vm = buildCoverageOpportunities({ editorial });
    return vm.hasLayer ? vm : null;
  }, [editorial]);
}
