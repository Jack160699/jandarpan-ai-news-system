"use client";

import Link from "next/link";
import { JdsCardImage } from "@/design-system/components/JdsCardImage/JdsCardImage";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { HomeArticle } from "@/lib/homepage/types";
import { AtlasTrustRow } from "../components/AtlasTrustRow";

const SCAN_IMAGE_SIZES = "(max-width: 430px) 42vw, (max-width: 480px) 40vw, 200px";

type QuickScanSectionProps = {
  stories: HomeArticle[];
  districtLabel?: string;
};

export function QuickScanSection({
  stories,
  districtLabel,
}: QuickScanSectionProps) {
  const { language } = useLanguage();

  if (stories.length < 2) return null;

  return (
    <section
      className="home-v31__section home-v31__enter atlas-scan"
      aria-labelledby="home-atlas-scan-title"
    >
      <h2 id="home-atlas-scan-title" className="atlas-scan__label">
        {pickBilingualLabel(language, "Quick Scan", "तेज़ पढ़ें")}
      </h2>

      <div className="atlas-scan-rail" role="list">
        {stories.map((story) => (
          <Link
            key={story.id}
            href={`/story/${story.slug}`}
            className="atlas-scan-card tap-target"
            role="listitem"
          >
            <div className="atlas-scan-card__media">
              <JdsCardImage
                src={story.imageUrl || story.ogImageUrl}
                alt={story.headline}
                category={story.categoryLabel ?? story.section ?? "news"}
                cropAspect="16:9"
                sizes={SCAN_IMAGE_SIZES}
                className="atlas-scan-card__image"
              />
            </div>
            <span className="atlas-scan-card__headline">{story.headline}</span>
            <AtlasTrustRow
              article={story}
              language={language}
              districtLabel={districtLabel}
              className="atlas-scan-card__trust"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
