import type { ClusterConfidenceReport } from "@/lib/news/coverage/confidence";

type ClusterConfidenceBadgeProps = {
  report: ClusterConfidenceReport;
};

export function ClusterConfidenceBadge({ report }: ClusterConfidenceBadgeProps) {
  const pct = Math.round(report.score * 100);
  return (
    <div
      className={`cluster-confidence cluster-confidence--${report.label}`}
      title={report.flags.join(", ") || "Multi-source cluster confidence"}
    >
      <span className="cluster-confidence__label">Cluster confidence</span>
      <strong className="cluster-confidence__value">{pct}%</strong>
      <span className="cluster-confidence__tier">{report.label}</span>
    </div>
  );
}
