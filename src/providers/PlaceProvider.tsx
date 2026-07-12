"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useTenant } from "@/providers/TenantProvider";

export type Place = {
  id: string;
  name: string;
  shortName: string;
  href: string;
  parentName: string;
};

const PlaceContext = createContext<Place | null>(null);

/**
 * Reader's current place — resolved from the tenant's configured regions and
 * the reader's saved district preference. Falls back to the tenant's default
 * (primary) region when the reader hasn't chosen one; never blocks render.
 */
export function PlaceProvider({ children }: { children: ReactNode }) {
  const { tenant } = useTenant();
  const { prefs } = useReaderPreferences();
  const { language } = useLanguage();

  const place = useMemo<Place>(() => {
    const regions = tenant.regions ?? [];
    const parentRegion = regions.find((r) => r.isPrimary);
    const districtRegions = regions.filter((r) => !r.isPrimary);
    const fallbackSlug = districtRegions[0]?.slug ?? parentRegion?.slug ?? "raipur";
    const slug = prefs.homeDistrict?.trim().toLowerCase() || fallbackSlug;
    const region =
      districtRegions.find((r) => r.slug === slug) ?? districtRegions[0];

    const localize = (en: string, hi: string) => (language !== "en" ? hi : en);
    const name = region ? localize(region.name, region.nameHi) : slug;

    return {
      id: region?.slug ?? slug,
      name,
      shortName: name,
      href: `/district/${region?.slug ?? slug}`,
      parentName: parentRegion
        ? localize(parentRegion.name, parentRegion.nameHi)
        : "",
    };
  }, [tenant, prefs.homeDistrict, language]);

  return (
    <PlaceContext.Provider value={place}>{children}</PlaceContext.Provider>
  );
}

export function usePlace(): Place {
  const ctx = useContext(PlaceContext);
  if (!ctx) {
    throw new Error("usePlace must be used within PlaceProvider");
  }
  return ctx;
}
