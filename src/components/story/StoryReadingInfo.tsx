import type { EditorialIntelligenceVm } from "@/lib/story/editorial-intelligence";

type StoryReadingInfoProps = {
  info: EditorialIntelligenceVm["readingInfo"];
  labels: EditorialIntelligenceVm["labels"];
  omitConfidence?: boolean;
};

export function StoryReadingInfo({
  info,
  labels,
  omitConfidence = false,
}: StoryReadingInfoProps) {
  const showUpdated =
    info.updatedAtLabel &&
    info.updatedAtIso &&
    info.publishedAtIso &&
    info.updatedAtIso !== info.publishedAtIso;

  const items = [
    info.readTime
      ? { key: "read", label: labels.readTime, value: info.readTime }
      : null,
    info.publishedAtLabel
      ? {
          key: "published",
          label: labels.published,
          value: info.publishedAtLabel,
          dateTime: info.publishedAtIso ?? undefined,
        }
      : null,
    showUpdated
      ? {
          key: "updated",
          label: labels.updated,
          value: info.updatedAtLabel,
          dateTime: info.updatedAtIso ?? undefined,
        }
      : null,
    info.district
      ? { key: "district", label: labels.district, value: info.district }
      : null,
    info.category
      ? { key: "category", label: labels.category, value: info.category }
      : null,
    info.language
      ? { key: "language", label: labels.language, value: info.language }
      : null,
    !omitConfidence && info.confidenceLabel
      ? {
          key: "confidence",
          label: labels.confidence,
          value: info.confidenceLabel,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
    dateTime?: string;
  }>;

  if (!items.length) return null;

  return (
    <dl
      className="story-editorial-intel__reading-info"
      aria-label={labels.readingInfoAria}
    >
      {items.map((item) => (
        <div key={item.key} className="story-editorial-intel__reading-item">
          <dt className="story-editorial-intel__reading-label">{item.label}</dt>
          <dd className="story-editorial-intel__reading-value">
            {item.dateTime ? (
              <time dateTime={item.dateTime}>{item.value}</time>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
