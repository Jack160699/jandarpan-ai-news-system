import { StoryLoadingView } from "@/components/loading";
import { ArticleV3Skeleton } from "@/features/article-v3";
import { isArticleV3Enabled } from "@/features/article-v3/config";
import { PageContainer } from "@/layouts";

export default function StoryLoading() {
  if (isArticleV3Enabled()) {
    return (
      <PageContainer width="article">
        <ArticleV3Skeleton />
      </PageContainer>
    );
  }
  return <StoryLoadingView />;
}
