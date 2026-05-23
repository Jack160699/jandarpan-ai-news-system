import Link from "next/link";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import type { HyperlocalFeedSummary } from "@/lib/homepage/types";

type HyperlocalFeedsProps = {
  feeds: HyperlocalFeedSummary[];
};

export function HyperlocalFeeds({ feeds }: HyperlocalFeedsProps) {
  if (!feeds.length) return null;

  return (
    <section
      id="local"
      className="nr-section nr-section--hyperlocal scroll-mt-24"
      aria-labelledby="hyperlocal-heading"
    >
      <div className="nr-wrap">
        <SectionHeader
          id="hyperlocal-heading"
          title="Near you"
          titleHi="आपके जिले"
        />

        <ul className="nr-hyperlocal__grid nr-hyperlocal__grid--daily" role="list">
          {feeds.map((f) => (
            <li key={f.districtSlug}>
              <Link
                href={`/district/${f.districtSlug}`}
                className="nr-hyperlocal__card tap-target"
              >
                <span className="nr-hyperlocal__district-hi">
                  {f.districtNameHi}
                </span>
                {f.topHeadline ? (
                  <p className="nr-hyperlocal__headline">{f.topHeadline}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
