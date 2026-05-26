import type { DistrictRiskAlert } from "@/lib/intelligence/types";
import type { DistrictHeatCell } from "@/lib/intelligence/types";

export function buildDistrictRiskAlerts(
  heatmap: DistrictHeatCell[],
  breakingByDistrict: Map<string, number>
): DistrictRiskAlert[] {
  return heatmap
    .map((cell) => {
      const breaking = breakingByDistrict.get(cell.districtSlug) ?? 0;
      const riskScore = Math.min(
        1,
        cell.intensity * 0.5 + breaking * 0.25 + (1 - cell.avgConfidence) * 0.25
      );

      return {
        districtSlug: cell.districtSlug,
        districtName: cell.districtName,
        riskScore,
        level:
          riskScore >= 0.7
            ? "critical"
            : riskScore >= 0.5
              ? "high"
              : riskScore >= 0.3
                ? "medium"
                : "low",
        articleCount: cell.articleCount,
        breakingCount: cell.breakingCount,
        alert: riskScore >= 0.5 || breaking >= 2,
        message:
          riskScore >= 0.7
            ? "Elevated misinfo/breaking risk — assign district editor"
            : breaking >= 2
              ? "Multiple breaking signals in district"
              : "Monitor",
      } as DistrictRiskAlert;
    })
    .filter((a) => a.alert)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 12);
}
