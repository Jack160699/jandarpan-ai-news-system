"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NEWSROOM_HEALTH_NAVIGATION } from "@/lib/admin/intelligence-navigation";
import {
  buildNewsroomHealth,
  type NewsroomHealthIndicator,
  type NewsroomHealthTone,
  type NewsroomHealthVm,
} from "@/lib/newsroom-health/build-health";

const TONE_CLASS: Record<NewsroomHealthTone, string> = {
  stable: "anr-pulse-item--stable",
  warning: "anr-pulse-item--warning",
  breaking: "anr-pulse-item--breaking",
  neutral: "",
};

type NewsroomHealthStripProps = {
  vm: NewsroomHealthVm | null;
  loading?: boolean;
  showNavigation?: boolean;
};

function HealthIndicatorCard({ indicator }: { indicator: NewsroomHealthIndicator }) {
  return (
    <li
      className={`anr-pulse-item ${TONE_CLASS[indicator.tone]}`.trim()}
      title={indicator.detail ?? undefined}
    >
      <span className="anr-pulse-item__label">{indicator.label}</span>
      <span className="anr-pulse-item__value">{indicator.value}</span>
      {indicator.detail ? (
        <span className="anr-meta block text-xs opacity-80">{indicator.detail}</span>
      ) : null}
    </li>
  );
}

export function NewsroomHealthStrip({
  vm,
  loading = false,
  showNavigation = true,
}: NewsroomHealthStripProps) {
  if (loading) {
    return <p className="anr-meta">Loading newsroom health…</p>;
  }

  if (!vm?.hasLayer) return null;

  const healthNav = NEWSROOM_HEALTH_NAVIGATION;

  return (
    <section
      className="anr-health-ops__launch-strip"
      aria-label="Newsroom health intelligence"
    >
      <h3 className="anr-meta m-0 mb-3 font-bold uppercase tracking-wide">
        Newsroom health
      </h3>
      {showNavigation ? (
        <nav className="anr-intel-inspector__actions" aria-label="Health navigation">
          <ul className="anr-intel-inspector__actions-list">
            {healthNav.links.map((entry) => (
              <li key={`${entry.href}-${entry.label}`}>
                <Link
                  href={entry.href}
                  className="anr-intel-inspector__action-link"
                  aria-label={entry.ariaLabel}
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <ul className="anr-health-ops__launch-grid">
        {vm.indicators.map((indicator) => (
          <HealthIndicatorCard key={indicator.id} indicator={indicator} />
        ))}
      </ul>
    </section>
  );
}

export function useNewsroomHealthFromEditorial(
  editorial: Parameters<typeof buildNewsroomHealth>[0]["editorial"],
  workflowAnalytics?: Parameters<typeof buildNewsroomHealth>[0]["workflowAnalytics"],
  launchWidgets?: Parameters<typeof buildNewsroomHealth>[0]["launchWidgets"]
): NewsroomHealthVm | null {
  return useMemo(() => {
    const vm = buildNewsroomHealth({
      editorial,
      workflowAnalytics,
      launchWidgets,
    });
    return vm.hasLayer ? vm : null;
  }, [editorial, workflowAnalytics, launchWidgets]);
}

export function NewsroomHealthPanel() {
  const [vm, setVm] = useState<NewsroomHealthVm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/newsroom/health", {
          credentials: "include",
        });
        const json = (await res.json()) as {
          health?: NewsroomHealthVm;
        };
        if (!cancelled) {
          setVm(json.health?.hasLayer ? json.health : null);
        }
      } catch {
        if (!cancelled) setVm(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return <NewsroomHealthStrip vm={vm} loading={loading} />;
}
