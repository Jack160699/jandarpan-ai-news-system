import { AISummary } from "@/design-system";

type AISummaryCardProps = {
  summary: string | null;
  label?: string;
  loading?: boolean;
};

export function AISummaryCard({
  summary,
  label = "AI Summary",
  loading = false,
}: AISummaryCardProps) {
  if (!summary?.trim() && !loading) return null;

  return (
    <AISummary
      summary={summary ?? ""}
      label={label}
      loading={loading}
      className="article-v3__section"
    />
  );
}
