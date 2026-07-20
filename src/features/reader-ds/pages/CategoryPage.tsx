"use client";

import type { HomeArticle } from "@/lib/homepage/types";
import { Ad } from "../components/Ad";
import { ArticleImage } from "../components/ArticleImage";
import { ChipRow } from "../components/ChipRow";
import { DesktopPrimaryNav } from "../components/DesktopPrimaryNav";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { Tag } from "../components/primitives";
import { SecondaryStory } from "../components/SecondaryStory";
import { useJdDsT } from "../i18n";
import { storyHref, toReaderStory } from "../utils";
import Link from "next/link";

type Props = {
  titleHi: string;
  titleEn: string;
  slug: string;
  articles: HomeArticle[];
  chips?: Array<{ label: string; href?: string }>;
};

/** A3 — category page (chrome i18n; category/story titles stay CMS). */
export function CategoryPageView({ titleHi, titleEn, slug, articles, chips }: Props) {
  const { t, locale } = useJdDsT();
  const lead = articles[0];
  const rest = articles.slice(1);
  const pageTitle = locale === "en" ? titleEn || titleHi : titleHi || titleEn;
  const defaultChips = chips ?? [
    { label: locale === "en" ? "All" : "सभी", href: `/category/${slug}` },
    { label: "छत्तीसगढ़", href: "/category/chhattisgarh" },
    { label: locale === "en" ? "National" : "राष्ट्रीय", href: "/category/politics" },
    { label: locale === "en" ? "Business" : "व्यापार", href: "/category/business" },
    { label: locale === "en" ? "Sports" : "खेल", href: "/category/sports" },
  ];

  return (
    <ReaderShell activeNav="home">
      <Masthead back pageTitle={pageTitle} />
      <DesktopPrimaryNav active="home" />
      <ChipRow chips={defaultChips} activeIndex={0} bordered />
      <main id="main-content" role="main" className="jd-shell" style={{ flex: 1, background: "var(--jd-paper)" }}>
        <div className="jd-hub-layout">
          <div className="jd-hub-lead">
            {lead ? (
              <div style={{ padding: "10px 14px 2px" }}>
                <Link href={storyHref(lead.slug)} style={{ color: "inherit", textDecoration: "none" }}>
                  <ArticleImage
                    src={lead.imageUrl}
                    alt={lead.headline}
                    ratio="lead"
                    caption={lead.categoryLabel}
                    priority
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 70vw, 640px"
                    tone="city"
                  />
                  <div style={{ margin: "8px 0 3px" }}>
                    <Tag>{lead.categoryLabel || pageTitle}</Tag>
                  </div>
                  <h2
                    className="jd-serif jd-lead-title"
                    style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 700 }}
                  >
                    {lead.headline}
                  </h2>
                </Link>
              </div>
            ) : (
              <p className="jd-ui" style={{ padding: 16, color: "var(--jd-muted)" }}>
                {t("home.categoryEmpty")}
              </p>
            )}
          </div>

          <div className="jd-hub-list" style={{ padding: "8px 14px 0" }}>
            {rest.slice(0, 3).map((a, i) => (
              <SecondaryStory
                key={a.slug}
                story={toReaderStory(a)}
                last={i === Math.min(rest.length, 3) - 1}
                toneIndex={i}
              />
            ))}
          </div>
        </div>

        {rest.length > 3 ? <Ad label="विज्ञापन · मिड-फ़ीड" close height={64} /> : null}

        <div className="jd-hub-list jd-hub-list--wide" style={{ padding: "0 14px" }}>
          {rest.slice(3).map((a, i, arr) => (
            <SecondaryStory
              key={a.slug}
              story={toReaderStory(a)}
              last={i === arr.length - 1}
              toneIndex={i + 3}
            />
          ))}
        </div>
      </main>
    </ReaderShell>
  );
}
