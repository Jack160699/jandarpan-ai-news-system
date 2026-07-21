import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ReaderLiveBlogPage } from "@/features/reader-ds/article";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import {
  buildLiveCoverageMetadata,
  EvolvingStoryPage,
} from "@/sections/coverage/EvolvingStoryPage";
import {
  getEvolvingCoverageBySlug,
  getLiveCoverageSlugs,
} from "@/lib/news/coverage/read";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  try {
    const slugs = await getLiveCoverageSlugs(30);
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const bundle = await getEvolvingCoverageBySlug(slug);
  if (!bundle) return { title: "Live coverage not found" };
  return buildLiveCoverageMetadata(bundle);
}

export default async function LiveCoveragePage({ params }: PageProps) {
  const { slug } = await params;
  const bundle = await getEvolvingCoverageBySlug(slug);
  if (!bundle) notFound();

  if (isReaderDesignSystemEnabled()) {
    return <ReaderLiveBlogPage bundle={bundle} />;
  }

  return (
    <PageShell variant="news">
      <main id="main-content" className="relative z-[2]" role="main">
        <EvolvingStoryPage bundle={bundle} />
      </main>
    </PageShell>
  );
}
