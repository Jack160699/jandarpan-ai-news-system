import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getGeneratedArticleBySlug } from "@/lib/newsroom/generated/read";
import { bundleFromRow } from "@/lib/news/shorts/build-short";
import { NOINDEX_FOLLOW_ROBOTS, SITE_URL } from "@/lib/seo";

export const revalidate = 60;

const SHORTS_CANONICAL = `${SITE_URL}/shorts`;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await getGeneratedArticleBySlug(slug);
  if (!row) return { title: "Short not found", robots: { index: false } };
  const bundle = bundleFromRow(row);
  const description =
    bundle?.summary60s ?? row.summary ?? row.seo_description ?? undefined;
  return {
    title: `${row.headline} · 60s Reel`,
    description,
    alternates: { canonical: SHORTS_CANONICAL },
    robots: NOINDEX_FOLLOW_ROBOTS,
    openGraph: {
      title: row.headline,
      description,
      type: "article",
      url: SHORTS_CANONICAL,
      images: row.hero_image_url ? [{ url: row.hero_image_url }] : undefined,
    },
  };
}

/** Deep link — opens vertical feed scrolled to this story */
export default async function ShortReelDeepLinkPage({ params }: PageProps) {
  const { slug } = await params;
  const row = await getGeneratedArticleBySlug(slug);
  if (!row) redirect("/shorts");
  redirect(`/shorts?start=${encodeURIComponent(slug)}`);
}
