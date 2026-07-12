"use client";

import { useMemo } from "react";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { IntelligenceDeepLinkNav } from "@/components/admin-newsroom/IntelligenceDeepLinkNav";
import {
  buildInsightDeepLinks,
  buildInsightDeepLinksForRanked,
  type IntelligenceDeepLink,
} from "@/lib/admin/intelligence-deep-links";
import {
  buildCoverageInsights,
  type CoverageInsightRankedItem,
  type CoverageInsightsVm,
} from "@/lib/newsroom-health/build-coverage-insights";
import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";

type CoverageInsightsPanelProps = {
  vm: CoverageInsightsVm | null;
  loading?: boolean;
};

function RankedInsightList({
  title,
  items,
  emptyLabel = "No data in snapshot",
}: {
  title: string;
  items: CoverageInsightRankedItem[];
  emptyLabel?: string;
}) {
  const linksByLabel = useMemo(() => {
    const map = new Map<string, IntelligenceDeepLink[]>();
    for (const item of items) {
      map.set(item.label, buildInsightDeepLinksForRanked(title, item));
    }
    return map;
  }, [title, items]);

  return (
    <section className="anr-coverage-insights__list-block" aria-label={title}>
      <h4 className="anr-coverage-insights__list-title">{title}</h4>
      {items.length ? (
        <ol className="anr-coverage-insights__ranked-list">
          {items.map((item) => (
            <li key={`${title}-${item.label}`}>
              <div className="anr-coverage-insights__ranked-row">
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
              <IntelligenceDeepLinkNav
                links={linksByLabel.get(item.label) ?? []}
                label={`Deep links for ${item.label}`}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="anr-meta">{emptyLabel}</p>
      )}
    </section>
  );
}

export function CoverageInsightsPanel({
  vm,
  loading = false,
}: CoverageInsightsPanelProps) {
  const kpiLinks = useMemo(() => {
    const map = new Map<string, IntelligenceDeepLink[]>();
    if (!vm?.hasLayer) return map;
    for (const kpi of vm.kpis) {
      map.set(
        kpi.id,
        buildInsightDeepLinks({
          kind: "kpi",
          label: kpi.label,
          kpiId: kpi.id,
        })
      );
    }
    return map;
  }, [vm]);

  if (loading) {
    return <p className="anr-meta">Loading coverage insights…</p>;
  }

  if (!vm?.hasLayer) return null;

  return (
    <AdminCard
      title="Coverage insights"
      description={`Read-only intelligence analytics from ${vm.sampleSize} recent articles`}
    >
      <section aria-label="Coverage insight metrics">
        <dl className="anr-coverage-insights__kpis">
          {vm.kpis.map((kpi) => (
            <div key={kpi.id} className="anr-coverage-insights__kpi">
              <dt>{kpi.label}</dt>
              <dd>
                <strong>{kpi.value}</strong>
                {kpi.detail ? (
                  <span className="anr-meta block text-xs">{kpi.detail}</span>
                ) : null}
                <IntelligenceDeepLinkNav
                  links={kpiLinks.get(kpi.id) ?? []}
                  label={`Deep links for ${kpi.label}`}
                />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="anr-grid anr-grid--2 anr-coverage-insights__grid">
        <RankedInsightList
          title="Top categories today"
          items={vm.topCategoriesToday}
        />
        <RankedInsightList title="Top districts" items={vm.topDistricts} />
        <RankedInsightList
          title="Most common entities"
          items={vm.topEntities}
        />
        <RankedInsightList
          title="Most active events"
          items={vm.activeEvents}
        />
        <RankedInsightList
          title="Articles by workflow stage"
          items={vm.workflowStages}
        />
        <RankedInsightList
          title="Publish decision distribution"
          items={vm.publishDecisions}
        />
      </div>
    </AdminCard>
  );
}

export function useCoverageInsightsFromEditorial(
  editorial: EditorialDashboardSnapshot | null
): CoverageInsightsVm | null {
  return useMemo(() => {
    const vm = buildCoverageInsights({ editorial });
    return vm.hasLayer ? vm : null;
  }, [editorial]);
}
