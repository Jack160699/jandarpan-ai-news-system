import Link from "next/link";
import type { HyperlocalFeedSummary } from "@/lib/homepage/types";

type HyperlocalFeedsProps = {
  feeds: HyperlocalFeedSummary[];
};

export function HyperlocalFeeds({ feeds }: HyperlocalFeedsProps) {
  if (!feeds.length) return null;

  return (
    <section className="nr-section" aria-labelledby="hyperlocal-heading">
      <div className="nr-wrap">
        <h2 id="hyperlocal-heading" className="nr-section-title">
          Hyperlocal · जिला समाचार
        </h2>
        <p className="nr-section-sub text-neutral-600">
          District-prioritized Chhattisgarh coverage
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {feeds.map((f) => (
            <li key={f.districtSlug}>
              <Link
                href={`/district/${f.districtSlug}`}
                className="block rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-red-300 hover:shadow-sm"
              >
                <span className="font-medium text-neutral-900">
                  {f.districtName}
                </span>
                <span className="ml-2 text-sm text-neutral-500">
                  {f.districtNameHi}
                </span>
                {f.topHeadline ? (
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-600">
                    {f.topHeadline}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-neutral-400">
                  {f.articleCount} stories
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
