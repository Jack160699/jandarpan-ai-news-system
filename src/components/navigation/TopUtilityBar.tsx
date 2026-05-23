"use client";

import { formatNewsDate } from "@/lib/i18n/format";
import { useLanguage } from "@/providers/LanguageProvider";

/** Edition strip — date + tagline (Bhaskar-style utility bar) */
export function TopUtilityBar() {
  const { t, language } = useLanguage();
  const today = formatNewsDate(new Date().toISOString(), language, "short");

  return (
    <div className="site-utility top-utility-bar" data-site-utility>
      <span className="site-utility__tagline">{t.home.mastheadTagline}</span>
      <time className="site-utility__date" dateTime={new Date().toISOString()}>
        {today}
      </time>
    </div>
  );
}
