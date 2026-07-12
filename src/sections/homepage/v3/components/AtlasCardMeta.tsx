"use client";

import { memo } from "react";
import type { HomeArticle } from "@/lib/homepage/types";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { cn } from "@/design-system/utils/cn";
import { AtlasTrustRow } from "./AtlasTrustRow";

export type AtlasCardMetaProps = {
  article: HomeArticle;
  language: NewsroomLanguage;
  category?: string;
  districtLabel?: string;
  suppressLive?: boolean;
  className?: string;
};

export const AtlasCardMeta = memo(function AtlasCardMeta({
  article,
  language,
  category,
  districtLabel,
  suppressLive,
  className,
}: AtlasCardMetaProps) {
  return (
    <div className={cn("atlas-card-meta", className)}>
      {category ? (
        <span className="atlas-card-meta__category">{category}</span>
      ) : null}
      <AtlasTrustRow
        article={article}
        language={language}
        districtLabel={districtLabel}
        suppressLive={suppressLive}
      />
    </div>
  );
});
