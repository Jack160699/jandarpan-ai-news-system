import { WidgetShell } from "../components/WidgetShell";
import type { ExecutiveAnalyticsData } from "../types";

function formatCount(n: number) {
  return n.toLocaleString("en-IN");
}

export type DistrictHeatmapPlaceholderProps = {
  districts: ExecutiveAnalyticsData["districtHeatmap"];
};

export function DistrictHeatmapPlaceholder({ districts }: DistrictHeatmapPlaceholderProps) {
  return (
    <WidgetShell
      title="District Heatmap"
      subtitle="Placeholder — geographic reader density"
      action={<span className="av3-badge av3-badge--placeholder">Preview</span>}
    >
      <div className="av3-heatmap" role="img" aria-label="District reader heatmap placeholder">
        {districts.map((cell) => (
          <div
            key={cell.id}
            className="av3-heat-cell"
            style={{
              background: `rgba(59, 130, 246, ${0.08 + cell.intensity * 0.35})`,
            }}
          >
            <span>{cell.name}</span>
            <strong>{formatCount(cell.readers)}</strong>
          </div>
        ))}
      </div>
      <p className="av3-placeholder-note">
        Interactive map visualization will replace this grid when geo analytics ships.
      </p>
    </WidgetShell>
  );
}
