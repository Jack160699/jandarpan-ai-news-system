import { StoryLoadingView } from "@/components/loading";
import { ArticleV3Skeleton } from "@/features/article-v3";
import { isArticleV3Enabled } from "@/features/article-v3/config";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { LoadingSkeleton } from "@/features/reader-ds/system";
import { PageContainer } from "@/layouts";

/** Avoid blank route flash — prefer DS skeleton when reader DS is on. */
export default function StoryLoading() {
  if (isReaderDesignSystemEnabled()) {
    return <LoadingSkeleton />;
  }
  if (isArticleV3Enabled()) {
    return (
      <PageContainer width="article">
        <ArticleV3Skeleton />
      </PageContainer>
    );
  }
  return <StoryLoadingView />;
}
