import type { BroadcastSegment } from "../types";

export type CanonicalCategory = {
  id: string;
  labelHi: string;
  labelEn: string;
};

export const CANONICAL_CATEGORIES: CanonicalCategory[] = [
  { id: "all", labelHi: "सभी", labelEn: "All" },
  { id: "crime", labelHi: "क्राइम", labelEn: "Crime" },
  { id: "politics", labelHi: "राजनीति", labelEn: "Politics" },
  { id: "national", labelHi: "राष्ट्रीय", labelEn: "National" },
  { id: "chhattisgarh", labelHi: "छत्तीसगढ़", labelEn: "Chhattisgarh" },
  { id: "business", labelHi: "बाज़ार", labelEn: "Market" },
  { id: "governance", labelHi: "प्रशासन", labelEn: "Governance" },
];

/**
 * Filter stories strictly by canonical category metadata.
 */
export function matchesCanonicalCategory(
  seg: BroadcastSegment,
  categoryId: string
): boolean {
  if (!categoryId || categoryId === "all") return true;

  const metadata = `${seg.section || ""} ${seg.categoryLabel || ""} ${seg.categoryLabelHi || ""} ${(seg as any).category || ""}`.toLowerCase();
  const headline = (seg.headline || "").toLowerCase();

  switch (categoryId) {
    case "crime":
      return (
        /crime|अपराध|पुलिस|police|arrest|cbi|acb|court|तस्करी|जब्त|कार्रवाई|धोखाधड़ी/.test(metadata) ||
        /क्राइम|अपराध|पुलिस|गांजा|सट्टा|रिश्वत|जब्त|गिरफ्तार/.test(headline)
      );
    case "politics":
      return (
        /politic|राजनीति|election|विधानसभा|मंत्रालय|मंत्री|congress|bjp|भाजपा|कांग्रेस|assembly/.test(metadata) ||
        /विधानसभा|राजनीति|विपक्ष|पक्ष-विपक्ष|प्रस्ताव|सत्र|मंत्री/.test(headline)
      );
    case "national":
      return (
        /national|राष्ट्रीय|india|देश|केंद्र|supreme|delhi/.test(metadata) ||
        /राष्ट्रीय|देशभर|भारत|केंद्र|सुप्रीम/.test(headline)
      );
    case "chhattisgarh":
      return true; // Real Chhattisgarh pool
    case "business":
      return (
        /business|व्यापार|बाज़ार|market|economy|मंडी|सोना|चांदी|पेट्रोल|डीजल|कारोबार/.test(metadata) ||
        /बाज़ार|मंडी|व्यापार|दाम|भाव|कारोबार|शेयर|सोलर/.test(headline)
      );
    case "governance":
      return (
        /governance|administration|प्रशासन|शासन|कलेक्टर|निगम|योजना|आदेश|विभाग|एडवाइजरी/.test(metadata) ||
        /प्रशासन|स्वास्थ्य विभाग|आदेश|कलेक्टर|यातायात|एडवाइजरी|स्टाइपेंड|विकास/.test(headline)
      );
    default:
      return true;
  }
}

/**
 * Preserves district scoping when viewing an explicit district context.
 * Does not inject unrelated district stories when a user has specifically locked a district.
 * If district choice is not explicitly locked (or statewide), all stories in the live broadcast
 * pool are eligible to display so the news list stays in sync with live TV playback.
 */
export function matchesDistrictScope(
  seg: BroadcastSegment,
  districtSlug?: string | null,
  isExplicitDistrict = false
): boolean {
  if (!districtSlug || districtSlug === "all" || districtSlug === "statewide") {
    return true;
  }

  // If the user has not explicitly locked a district, do not artificially exclude
  // verified live stories from other CG districts in the general live broadcast pool.
  if (!isExplicitDistrict) {
    return true;
  }

  const rawDist = (seg.district || seg.districtHi || "").toLowerCase();
  const target = districtSlug.toLowerCase();

  // If story has no specific district or is statewide, allow it
  if (
    !rawDist ||
    rawDist.includes("राज्य") ||
    rawDist.includes("state") ||
    rawDist.includes("छत्तीसगढ़") ||
    rawDist.includes("chhattisgarh")
  ) {
    return true;
  }

  // If story has a specific district, it must match the active district context
  return rawDist.includes(target);
}
