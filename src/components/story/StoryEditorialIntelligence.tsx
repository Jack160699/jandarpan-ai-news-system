import { StoryHighlights } from "@/components/story/StoryHighlights";
import { StoryReadingInfo } from "@/components/story/StoryReadingInfo";
import { StorySourceTransparency } from "@/components/story/StorySourceTransparency";
import { StorySummaryBox } from "@/components/story/StorySummaryBox";
import { StoryWhyThisMatters } from "@/components/story/StoryWhyThisMatters";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { EditorialIntelligenceVm } from "@/lib/story/editorial-intelligence";
import { getDictionary } from "@/lib/i18n/dictionaries";

type StoryEditorialIntelligenceProps = {
  vm: EditorialIntelligenceVm;
  sourceCount: number;
  displayLanguage: NewsroomLanguage;
  omitConfidence?: boolean;
};

export function StoryEditorialIntelligence({
  vm,
  sourceCount,
  displayLanguage,
  omitConfidence = false,
}: StoryEditorialIntelligenceProps) {
  if (!vm.hasLayer) return null;

  const t = getDictionary(displayLanguage);

  return (
    <section
      className="story-editorial-intel"
      aria-label="Editorial intelligence"
    >
      <StoryReadingInfo
        info={vm.readingInfo}
        labels={vm.labels}
        omitConfidence={omitConfidence}
      />

      {vm.aiSummary ? (
        <StorySummaryBox
          summary={vm.aiSummary}
          title={vm.labels.aiSummaryTitle}
          readHint={vm.labels.readHint}
          aiLabel={t.shorts.narrationShort}
          transparencyTitle={t.article.transparencyTitle}
        />
      ) : null}

      {vm.whyThisMatters ? (
        <StoryWhyThisMatters
          text={vm.whyThisMatters}
          title={vm.labels.whyTitle}
        />
      ) : null}

      {vm.takeaways.length ? (
        <StoryHighlights items={vm.takeaways} title={vm.labels.takeawaysTitle} />
      ) : null}

      <StorySourceTransparency
        vm={vm}
        sourceCount={sourceCount}
        language={displayLanguage}
        omitTrustFlags={omitConfidence}
      />
    </section>
  );
}
