import { getDictionary } from "@/lib/i18n/dictionaries";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { EditorialIntelligenceVm } from "@/lib/story/editorial-intelligence";

type StorySourceTransparencyProps = {
  vm: Pick<
    EditorialIntelligenceVm,
    | "sources"
    | "primarySource"
    | "officialSource"
    | "flags"
    | "labels"
  >;
  sourceCount: number;
  language: NewsroomLanguage;
  omitTrustFlags?: boolean;
};

export function StorySourceTransparency({
  vm,
  sourceCount,
  language,
  omitTrustFlags = false,
}: StorySourceTransparencyProps) {
  const t = getDictionary(language);
  const supporting = vm.sources.filter(
    (s) => s.kind === "supporting" && s.id !== vm.officialSource?.id
  );

  const hasSourceList =
    vm.primarySource || vm.officialSource || supporting.length > 0;

  if (
    !hasSourceList &&
    !omitTrustFlags &&
    !vm.flags.aiGenerated &&
    !vm.flags.humanReviewed
  ) {
    return null;
  }

  return (
    <aside
      className="story-desk-note story-editorial-intel__sources"
      aria-label={vm.labels.sourcesTitle}
    >
      <div className="story-desk-note__mast">
        <span className="story-desk-note__mark" aria-hidden>
          ✓
        </span>
        <p className="story-desk-note__kicker">{t.story.deskNoteKicker}</p>
      </div>

      {!omitTrustFlags &&
      (vm.flags.aiGenerated || vm.flags.humanReviewed || sourceCount > 1) ? (
        <div className="story-editorial-intel__source-flags">
          {vm.flags.aiGenerated ? (
            <span className="story-editorial-intel__source-flag">
              {vm.labels.aiGenerated}
            </span>
          ) : null}
          {vm.flags.humanReviewed ? (
            <span className="story-editorial-intel__source-flag story-editorial-intel__source-flag--reviewed">
              {vm.labels.humanReviewed}
            </span>
          ) : null}
          {sourceCount > 1 ? (
            <span className="story-editorial-intel__source-flag">
              {sourceCount} sources
            </span>
          ) : null}
        </div>
      ) : null}

      <p className="story-desk-note__text">{t.story.deskNoteBody}</p>

      {hasSourceList ? (
        <div className="story-editorial-intel__source-groups">
          {vm.primarySource ? (
            <div className="story-editorial-intel__source-group">
              <p className="story-editorial-intel__source-heading">
                {vm.labels.primarySource}
              </p>
              <SourceLink item={vm.primarySource} />
            </div>
          ) : null}

          {vm.officialSource &&
          vm.officialSource.id !== vm.primarySource?.id ? (
            <div className="story-editorial-intel__source-group">
              <p className="story-editorial-intel__source-heading">
                {vm.labels.officialSource}
              </p>
              <SourceLink item={vm.officialSource} />
            </div>
          ) : null}

          {supporting.length ? (
            <div className="story-editorial-intel__source-group">
              <p className="story-editorial-intel__source-heading">
                {vm.labels.supportingSources}
              </p>
              <ul className="story-editorial-intel__source-list">
                {supporting.map((item) => (
                  <li key={item.id}>
                    <SourceLink item={item} showConfidence />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="story-desk-note__fine">{t.story.deskNoteFine}</p>
    </aside>
  );
}

function SourceLink({
  item,
  showConfidence = false,
}: {
  item: EditorialIntelligenceVm["sources"][number];
  showConfidence?: boolean;
}) {
  const confidenceLabel =
    showConfidence && typeof item.confidence === "number"
      ? `${Math.round(item.confidence * 100)}%`
      : null;

  if (item.url.startsWith("http")) {
    return (
      <a
        href={item.url}
        className="story-editorial-intel__source-link"
        rel="noopener noreferrer"
        target="_blank"
      >
        <span>{item.name}</span>
        {confidenceLabel ? (
          <span className="story-editorial-intel__source-confidence">
            {confidenceLabel}
          </span>
        ) : null}
      </a>
    );
  }

  return (
    <span className="story-editorial-intel__source-link story-editorial-intel__source-link--text">
      <span>{item.name}</span>
      {confidenceLabel ? (
        <span className="story-editorial-intel__source-confidence">
          {confidenceLabel}
        </span>
      ) : null}
    </span>
  );
}
