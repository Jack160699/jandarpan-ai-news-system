import type { ThumbAspect } from "@/lib/news/images/aspects";
import { aspectClassName, normalizeMediaAspect } from "@/lib/news/images/aspects";

type MediaImageSkeletonProps = {
  aspect?: ThumbAspect;
  fillParent?: boolean;
  className?: string;
};

/** Matches MediaImage frame — prevents CLS while content loads */
export function MediaImageSkeleton({
  aspect = "16:9",
  fillParent = false,
  className = "",
}: MediaImageSkeletonProps) {
  const aspectNorm = normalizeMediaAspect(aspect);
  const frameClass =
    fillParent || aspectNorm === "fill"
      ? "media-frame media-frame--fill"
      : `media-frame ${aspectClassName(aspectNorm)}`;

  return (
    <div className={`${frameClass} ${className}`.trim()} aria-hidden>
      <div className="media-frame__inner">
        <span className="media-frame__skeleton" />
      </div>
    </div>
  );
}
