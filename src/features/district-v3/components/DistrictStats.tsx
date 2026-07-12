import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { EmptyState } from "@/design-system/components/EmptyState";
import { DistrictCard } from "./DistrictCard";
import type { DistrictStat } from "../types";

export type DistrictStatsProps = {
  stats: DistrictStat[];
};

function TrendIcon({ trend }: { trend?: DistrictStat["trend"] }) {
  if (trend === "up") return <TrendingUp size={14} aria-hidden />;
  if (trend === "down") return <TrendingDown size={14} aria-hidden />;
  return <Minus size={14} aria-hidden />;
}

export function DistrictStats({ stats }: DistrictStatsProps) {
  return (
    <DistrictCard id="dv3-stats" aria-labelledby="dv3-stats-title">
      <SectionHeader title="District at a glance" kicker="Stats" />
      <h2 id="dv3-stats-title" className="sr-only">
        District statistics
      </h2>

      {stats.length === 0 ? (
        <EmptyState
          title="No stats available"
          description="District statistics will appear here when data is connected."
          icon="📊"
        />
      ) : (
        <dl className="dv3-stats">
          {stats.map((stat) => (
            <div key={stat.id} className="dv3-stats__item">
              <dt className="dv3-stats__label">{stat.label}</dt>
              <dd className="dv3-stats__value">
                <span>{stat.value}</span>
                {stat.trend ? (
                  <span className="dv3-stats__trend" aria-label={`Trend ${stat.trend}`}>
                    <TrendIcon trend={stat.trend} />
                  </span>
                ) : null}
              </dd>
              {stat.meta ? <p className="dv3-stats__meta">{stat.meta}</p> : null}
            </div>
          ))}
        </dl>
      )}
    </DistrictCard>
  );
}
