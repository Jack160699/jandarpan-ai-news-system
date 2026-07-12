import { memo } from "react";
import { AtlasFactBox } from "./AtlasFactBox";
import type { EditorialIntelligenceVm } from "@/lib/story/editorial-intelligence";

type AtlasStoryFactSectionsProps = {
  editorial: Pick<
    EditorialIntelligenceVm,
    "takeaways" | "whyThisMatters" | "labels"
  >;
};

export const AtlasStoryFactSections = memo(function AtlasStoryFactSections({
  editorial,
}: AtlasStoryFactSectionsProps) {
  const takeaways = editorial.takeaways.filter((item) => item.trim().length > 0);
  const why = editorial.whyThisMatters?.trim();

  if (!takeaways.length && !why) return null;

  return (
    <div className="atlas-story-facts">
      {takeaways.length > 0 ? (
        <AtlasFactBox title={editorial.labels.takeawaysTitle} variant="facts">
          <ul className="atlas-fact-box__list">
            {takeaways.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AtlasFactBox>
      ) : null}
      {why ? (
        <AtlasFactBox title={editorial.labels.whyTitle} variant="explainer">
          <p className="atlas-fact-box__explainer">{why}</p>
        </AtlasFactBox>
      ) : null}
    </div>
  );
});
