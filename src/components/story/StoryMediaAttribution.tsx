import { Camera } from "lucide-react";
import type { EditorialMediaRightsStatus } from "@/lib/media/media-record";

type StoryMediaAttributionProps = {
  caption?: string | null;
  credit?: string | null;
  sourceUrl?: string | null;
  rightsStatus?: EditorialMediaRightsStatus | null;
  className?: string;
};

function formatRightsLabel(rights?: EditorialMediaRightsStatus | null): string | null {
  switch (rights) {
    case "publisher_authorized":
      return "प्रकाशक साभार / अधिकृत";
    case "creative_commons":
      return "क्रिएटिव कॉमन्स (CC)";
    case "public_domain":
      return "सार्वजनिक डोमेन";
    case "official_embed":
      return "आधिकारिक एम्बेड";
    case "licensed":
      return "लाइसेंस्ड";
    default:
      return null;
  }
}

export function StoryMediaAttribution({
  caption,
  credit,
  sourceUrl,
  rightsStatus,
  className = "",
}: StoryMediaAttributionProps) {
  if (!caption && !credit) return null;

  const rightsLabel = formatRightsLabel(rightsStatus);

  return (
    <figcaption className={`story-media-attribution mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--jds-color-text-secondary,#666)] px-1 ${className}`}>
      {caption ? (
        <span className="story-media-caption font-normal leading-relaxed text-[var(--jds-color-text-primary,#222)]">
          {caption}
        </span>
      ) : <span />}

      {credit ? (
        <span className="story-media-credit inline-flex items-center gap-1.5 shrink-0 text-[var(--jds-color-text-tertiary,#777)] font-medium">
          <Camera size={13} aria-hidden className="shrink-0" />
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-[var(--jds-color-brand-primary)]"
            >
              {credit}
            </a>
          ) : (
            <span>{credit}</span>
          )}
          {rightsLabel ? (
            <span className="text-[10px] uppercase tracking-wider bg-[var(--jds-color-surface-secondary,#eee)] px-1.5 py-0.5 rounded text-[var(--jds-color-text-secondary,#555)]">
              {rightsLabel}
            </span>
          ) : null}
        </span>
      ) : null}
    </figcaption>
  );
}
