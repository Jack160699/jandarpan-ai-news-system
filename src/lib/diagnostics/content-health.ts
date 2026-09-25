/**
 * Internal Content Availability Health Diagnostic.
 * 
 * Reports live inventory health across:
 * - Taza (chronological feed freshness, eligible count, timestamp spread)
 * - Home (6 canonical editorial sections: politics, crime, national, international, entertainment, sports)
 * - My Jila (district story counts for Durg, Raipur, Bilaspur, Bastar, etc.)
 */

import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { getStaticFallbackArticlePool } from "@/lib/news/fallback/wire-articles";
import { hasVerifiedRealMedia } from "@/lib/news/images/validate";
import { filterRowsForDistrict } from "@/lib/regional/hyperlocal-feed";
import { toHomeArticle } from "@/lib/homepage/generated-feed";

export type ContentHealthReport = {
  timestamp: string;
  taza: {
    eligibleStoryCount: number;
    newestPublishedAt: string | null;
    oldestPublishedAt: string | null;
    newestPublishedIst: string | null;
    oldestPublishedIst: string | null;
  };
  homeSections: {
    politics: number;
    crime: number;
    national: number;
    international: number;
    entertainment: number;
    sports: number;
  };
  districts: Record<string, number>;
  totalVerifiedInventory: number;
  status: "healthy" | "sparse" | "critical";
};

function formatIst(isoStr?: string | null): string | null {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return null;
  }
}

export async function runContentAvailabilityHealthCheck(): Promise<ContentHealthReport> {
  const pool = await fetchGeneratedArticlePool(160, { select: "homepage" });
  const fallback = getStaticFallbackArticlePool();

  const seenSlugs = new Set<string>();
  const combined = [];

  for (const r of pool) {
    if (r?.slug && !seenSlugs.has(r.slug)) {
      seenSlugs.add(r.slug);
      combined.push(r);
    }
  }

  for (const r of fallback) {
    if (r?.slug && !seenSlugs.has(r.slug)) {
      seenSlugs.add(r.slug);
      combined.push(r);
    }
  }

  // Taza eligibility: verified media + chronological ordering
  const tazaArticles = combined
    .map((r) => toHomeArticle(r, undefined, "hi"))
    .filter((a): a is NonNullable<typeof a> => a !== null && hasVerifiedRealMedia(a.imageUrl))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const newest = tazaArticles[0]?.publishedAt ?? null;
  const oldest = tazaArticles[tazaArticles.length - 1]?.publishedAt ?? null;

  // Home 6 Canonical Sections Matching
  const matchSection = (regex: RegExp) =>
    tazaArticles.filter((s) => {
      const text = `${s.categoryLabel || ""} ${s.section || ""} ${(s.tags || []).join(" ")} ${s.headline}`.toLowerCase();
      return regex.test(text);
    }).length;

  const politics = matchSection(/politic|राजनीति|election|चुनाव|bjp|congress|विधानसभा|assembly|minister|mantri|governance|सरकार|cm|mla|party|सदन/i);
  const crime = matchSection(/crime|अपराध|police|पुलिस|arrest|गिरफ्तार|murder|हत्या|हादसा|accident|court|कोर्ट|scam|ghotala|घोटाला|smuggling|तस्करी|fraud|कांड/i);
  const national = tazaArticles.filter((s) => {
    const text = `${s.categoryLabel || ""} ${s.section || ""} ${(s.tags || []).join(" ")} ${s.headline}`.toLowerCase();
    if (/entertainment|मनोरंजन|bollywood|cinema|सिनेमा|फिल्म|नाट्य|रंगमंच|ott|sport|खेल|cricket|क्रिकेट|हॉकी|hockey|रणजी/i.test(text)) return false;
    return /india|national|देश|राष्ट्रीय|delhi|दिल्ली|parliament|संसद|pm|modi|centre|केंद्|supreme court|सुप्रीम कोर्ट|bharat/i.test(text);
  }).length;
  const international = matchSection(/world|international|विदेश|अंतरराष्ट्रीय|global|un|us|usa|china|russia|ukraine|israel|iran|war|युद्ध/i);
  const entertainment = matchSection(/entertainment|मनोरंजन|bollywood|cinema|सिनेमा|फिल्म|movie|ott|celebrity|actress|actor|trailer|गाना|संगीत|नाट्य|रंगमंच/i);
  const sports = matchSection(/sport|खेल|cricket|क्रिकेट|football|फुटबॉल|hockey|हॉकी|olympic|match|मैच|ipl|tournament|medal|खिलाड़ी/i);

  // Key District Counts
  const targetDistricts = ["durg", "raipur", "bilaspur", "bastar", "rajnandgaon", "korba", "raigarh", "surguja"];
  const districtCounts: Record<string, number> = {};
  for (const d of targetDistricts) {
    districtCounts[d] = filterRowsForDistrict(combined, d).length;
  }

  const isHealthy =
    tazaArticles.length >= 15 &&
    politics >= 2 &&
    crime >= 2 &&
    national >= 2 &&
    international >= 2 &&
    entertainment >= 2 &&
    sports >= 2 &&
    (districtCounts.durg ?? 0) >= 1;

  return {
    timestamp: new Date().toISOString(),
    taza: {
      eligibleStoryCount: tazaArticles.length,
      newestPublishedAt: newest,
      oldestPublishedAt: oldest,
      newestPublishedIst: formatIst(newest),
      oldestPublishedIst: formatIst(oldest),
    },
    homeSections: {
      politics,
      crime,
      national,
      international,
      entertainment,
      sports,
    },
    districts: districtCounts,
    totalVerifiedInventory: tazaArticles.length,
    status: isHealthy ? "healthy" : tazaArticles.length >= 5 ? "sparse" : "critical",
  };
}
