import { AISummary as JdsAISummary } from "@/design-system/components/AISummary";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { BriefCard } from "./BriefCard";

export type MorningBriefAISummaryProps = {
  summary: string;
  loading?: boolean;
  label?: string;
};

export function MorningBriefAISummary({
  summary,
  loading,
  label = "Editor's AI Summary",
}: MorningBriefAISummaryProps) {
  return (
    <BriefCard id="mb-ai-summary" tone="accent" aria-labelledby="mb-ai-summary-title">
      <SectionHeader title="AI Summary" kicker="Your digest" />
      <h2 id="mb-ai-summary-title" className="sr-only">
        AI-generated morning summary
      </h2>
      <JdsAISummary summary={summary} label={label} loading={loading} />
    </BriefCard>
  );
}
