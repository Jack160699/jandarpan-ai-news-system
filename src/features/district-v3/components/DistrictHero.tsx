import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import type { DistrictInfo } from "../types";

export type DistrictHeroProps = {
  district: DistrictInfo;
};

export function DistrictHero({ district }: DistrictHeroProps) {
  const { language } = useLanguage();
  const displayName = pickBilingualLabel(language, district.name, district.nameHi);

  return (
    <header className="dv3-hero dv3-enter" aria-labelledby="dv3-hero-title">
      <p className="dv3-hero__kicker">
        <MapPin size={14} aria-hidden />
        {pickBilingualLabel(language, "My District", "मेरा जिला")}
      </p>
      <h1 id="dv3-hero-title" className="dv3-hero__title">
        {displayName}
      </h1>
      <p className="dv3-hero__subtitle">
        {pickBilingualLabel(
          language,
          `Hyperlocal news & civic updates · Tier ${district.priority}`,
          `स्थानीय समाचार · स्तर ${district.priority}`
        )}
      </p>
      <div className="dv3-hero__actions">
        <Badge variant="default">
          {pickBilingualLabel(language, "Chhattisgarh", "छत्तीसगढ़")}
        </Badge>
        <Link href="/" className="dv3-hero__link">
          {pickBilingualLabel(language, "Statewide homepage", "राज्य होमपेज")}
        </Link>
      </div>
    </header>
  );
}
