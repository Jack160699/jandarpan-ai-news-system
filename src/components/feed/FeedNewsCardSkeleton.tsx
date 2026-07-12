import { EditorialCardSkeleton } from "@/design-system/components/editorial/EditorialCardSkeleton";

type FeedNewsCardSkeletonProps = {
  variant?: "standard" | "compact" | "lead";
};

/**
 * @deprecated Legacy skeleton shell — delegates to design-system EditorialCardSkeleton.
 */
export function FeedNewsCardSkeleton({
  variant = "standard",
}: FeedNewsCardSkeletonProps) {
  const dsVariant =
    variant === "lead" ? "featured" : variant === "compact" ? "compact" : "standard";

  return (
    <EditorialCardSkeleton
      className={`feed-news-card feed-news-card--skeleton feed-news-card--${variant}`}
      variant={dsVariant}
      layout={variant === "compact" ? "horizontal" : "vertical"}
      showActions
    />
  );
}
