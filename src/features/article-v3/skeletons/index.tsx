import { Skeleton } from "@/design-system";

export function ArticleV3Skeleton() {
  return (
    <div className="article-v3-skeleton" aria-busy="true" aria-label="Loading article">
      <div className="article-v3-skeleton__hero">
        <Skeleton variant="text" style={{ width: "40%", height: 16 }} />
        <Skeleton variant="title" style={{ width: "90%" }} />
        <Skeleton variant="title" style={{ width: "70%" }} />
        <Skeleton variant="media" style={{ aspectRatio: "16/9", width: "100%" }} />
      </div>
      <div className="article-v3-skeleton__body">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" style={{ width: "85%" }} />
        <Skeleton variant="text" />
        <Skeleton variant="text" style={{ width: "92%" }} />
      </div>
    </div>
  );
}
