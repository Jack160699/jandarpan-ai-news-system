"use client";

import Link from "next/link";
import { Building2, Car, Briefcase, Calendar, Cloud } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { NewsCard } from "@/design-system/components/NewsCard";
import { EmptyState } from "@/design-system/components/EmptyState";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";

type MyDistrictSectionProps = {
  districtSlug: string;
  districtNews: HomeArticle[];
};

const PLACEHOLDERS = [
  { id: "weather", label: "Weather", icon: Cloud, text: "28°C · Partly cloudy" },
  { id: "government", label: "Government", icon: Building2, text: "Scheme updates soon" },
  { id: "traffic", label: "Traffic", icon: Car, text: "Road alerts soon" },
  { id: "jobs", label: "Jobs", icon: Briefcase, text: "Local vacancies soon" },
  { id: "events", label: "Events", icon: Calendar, text: "Community events soon" },
] as const;

export function MyDistrictSection({
  districtSlug,
  districtNews,
}: MyDistrictSectionProps) {
  const { language } = useLanguage();
  const districtLabel =
    districtSlug.charAt(0).toUpperCase() + districtSlug.slice(1).replace(/-/g, " ");

  return (
    <section
      className="home-v3__section home-v3__enter"
      aria-labelledby="home-v3-district-title"
    >
      <SectionHeader
        title={`My District — ${districtLabel}`}
        kicker="Hyperlocal"
        action={
          <Link
            href={`/district/${districtSlug}`}
            className="text-[var(--jds-text-caption)] text-[var(--jds-color-brand-primary)]"
          >
            View all
          </Link>
        }
      />
      <h2 id="home-v3-district-title" className="sr-only">
        My District
      </h2>

      <div className="home-v3-district">
        <div className="home-v3-district__widgets">
          {PLACEHOLDERS.map(({ id, label, icon: Icon, text }) => (
            <div key={id} className="home-v3-district__widget">
              <div className="home-v3-district__widget-label flex items-center gap-1">
                <Icon size={12} aria-hidden />
                {label}
              </div>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {districtNews.length > 0 ? (
          <div className="flex flex-col gap-[var(--jds-space-md)]">
            {districtNews.slice(0, 4).map((article) => (
              <NewsCard
                key={article.id}
                headline={article.headline}
                excerpt={article.summary}
                imageUrl={article.imageUrl}
                publishedAt={formatHomeTime(article.publishedAt, language)}
                readTime={article.readingTime}
                layout="horizontal"
                href={`/story/${article.slug}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No district stories yet"
            description={`We're gathering the latest from ${districtLabel}. Check back soon.`}
            icon="📍"
          />
        )}
      </div>
    </section>
  );
}
