"use client";

import { formatNewsDate } from "@/lib/i18n/format";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTenant } from "@/providers/TenantProvider";

type HomepageMastheadProps = {
  brandName?: string;
};

export function HomepageMasthead({ brandName }: HomepageMastheadProps) {
  const { t, language } = useLanguage();
  const { tenant } = useTenant();
  const name =
    brandName ??
    (language === "en"
      ? tenant?.branding.nameEn
      : tenant?.branding.nameHi) ??
    "हमार छत्तीसगढ़";

  const today = formatNewsDate(new Date().toISOString(), language, "short");

  return (
    <header id="top-news" className="nr-masthead nr-masthead--daily nr-wrap scroll-mt-24">
      <div className="masthead-hc__rule-brand mb-2" aria-hidden />
      <h1 className="nr-masthead__brand masthead-title-hi">{name}</h1>
      <p className="nr-masthead__tagline text-sm text-[var(--ink-tertiary)]">
        {t.home.mastheadTagline}
      </p>
      <p className="nr-masthead__date">
        {today} · {t.nav.chhattisgarh}
      </p>
    </header>
  );
}
