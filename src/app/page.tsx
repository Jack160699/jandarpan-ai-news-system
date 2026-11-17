import { redirect } from "next/navigation";
import { buildHubPageMetadata } from "@/lib/seo";
import { BRAND } from "@/lib/brand";

const BASE_TITLE = `Jan Darpan Live · ${BRAND.nameEn}`;
const BASE_DESCRIPTION =
  "Jan Darpan Live — AI-powered 24/7 newsroom with a virtual anchor, breaking news, and continuous Chhattisgarh coverage.";

export const metadata = buildHubPageMetadata({
  title: BASE_TITLE,
  description: BASE_DESCRIPTION,
  path: "/live",
});

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Root domain (https://jandarpan.news) redirects directly into the Jan Darpan Live TV experience.
 * Newspaper front page remains independently accessible at /home.
 */
export default async function RootPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
    else if (Array.isArray(v) && v[0]) qs.set(k, v[0]);
  }
  const qStr = qs.toString();
  redirect(qStr ? `/live?${qStr}` : "/live");
}
