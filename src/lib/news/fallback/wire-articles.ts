/**
 * Static Hindi/India wire fallback — shown when DB + APIs are unavailable.
 * Keeps ticker and cards populated in production without layout changes.
 */

import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import { EDITORIAL_IMAGES } from "@/lib/editorial-images";
import { CG_DISTRICTS } from "@/lib/regional/districts";

const NOW = () => new Date().toISOString();

function fallbackTranslations(
  hindiHeadline: string,
  hindiSummary: string,
  englishHeadline: string,
  englishSummary: string
): NonNullable<GeneratedArticleRow["translations"]> {
  const translatedAt = NOW();
  const bundle = (headline: string, summary: string) => ({
    headline,
    summary,
    article_body: summary,
    seo_title: headline,
    seo_description: summary,
    reading_time: "3",
    translated_at: translatedAt,
    model: "editorial-fallback",
  });

  return {
    cg: bundle(hindiHeadline, hindiSummary),
    en: bundle(englishHeadline, englishSummary),
  };
}

function row(
  partial: Pick<GeneratedArticleRow, "id" | "slug" | "headline" | "summary"> &
    Partial<GeneratedArticleRow>
): GeneratedArticleRow {
  return {
    event_id: null,
    article_body: null,
    hero_image_url: null,
    seo_title: partial.headline,
    seo_description: partial.summary,
    reading_time: "3",
    language: "hi",
    tags: ["chhattisgarh"],
    published_at: NOW(),
    editorial_status: "approved",
    homepage_pin: false,
    pinned_at: null,
    editorial_metadata: {
      ai_confidence: 0.42,
      used_fallback: true,
      is_breaking: partial.editorial_metadata?.is_breaking ?? false,
      source_count: 1,
    },
    created_at: NOW(),
    ...partial,
  };
}

/** Resolve a static fallback story by slug when DB/API layers are unavailable. */
export function getStaticFallbackArticleBySlug(
  slug: string
): GeneratedArticleRow | null {
  const decoded = decodeURIComponent(slug).trim();
  return (
    getStaticFallbackArticlePool().find(
      (row) => row.slug === decoded || row.slug === slug
    ) ?? null
  );
}

/** Curated desk headlines — rotate-safe slugs for /story routes */
export function getStaticFallbackArticlePool(): GeneratedArticleRow[] {
  const featured = [
    row({
      id: "fallback-cg-1",
      slug: "raipur-metro-update-fallback",
      headline: "रायपुर: शहर में आज मौसम सामान्य रहेगा, यातायात सुचारू",
      summary:
        "स्थानीय प्रशासन ने शाम के समय भारी वाहनों के लिए वैकल्पिक मार्ग जारी किए हैं।",
      hero_image_url: EDITORIAL_IMAGES.raipurCity,
      translations: fallbackTranslations(
        "रायपुर: शहर में आज मौसम सामान्य रहेगा, यातायात सुचारू",
        "स्थानीय प्रशासन ने शाम के समय भारी वाहनों के लिए वैकल्पिक मार्ग जारी किए हैं।",
        "Raipur traffic remains smooth as the city issues an evening route advisory",
        "The local administration has published alternate evening routes for heavy vehicles."
      ),
      tags: ["raipur", "chhattisgarh"],
      editorial_metadata: { is_breaking: true, ai_confidence: 0.5 },
    }),
    row({
      id: "fallback-cg-2",
      slug: "bilaspur-power-grid-fallback",
      headline: "बिलासपुर: बिजली आपूर्ति स्थिर, रखरखाव कार्य पूरा",
      summary: "उपभोक्ताओं को अगले 24 घंटे में नियोजित कटौती की संभावना नहीं।",
      hero_image_url: EDITORIAL_IMAGES.steelIndustry,
      translations: fallbackTranslations(
        "बिलासपुर: बिजली आपूर्ति स्थिर, रखरखाव कार्य पूरा",
        "उपभोक्ताओं को अगले 24 घंटे में नियोजित कटौती की संभावना नहीं।",
        "Bilaspur power supply stabilises after maintenance work",
        "Officials say no planned power cut is expected during the next 24 hours."
      ),
      tags: ["bilaspur", "chhattisgarh"],
    }),
    row({
      id: "fallback-cg-3",
      slug: "bastar-health-camp-fallback",
      headline: "बस्तर: मोबाइल स्वास्थ्य शिविर में हजारों लाभार्थी",
      summary: "जिला अस्पताल ने मुफ्त जांच शिविर का विस्तार किया है।",
      hero_image_url: EDITORIAL_IMAGES.ruralHealth,
      translations: fallbackTranslations(
        "बस्तर: मोबाइल स्वास्थ्य शिविर में हजारों लाभार्थी",
        "जिला अस्पताल ने मुफ्त जांच शिविर का विस्तार किया है।",
        "Thousands benefit as Bastar expands its mobile health camps",
        "The district hospital has extended free screening camps to more communities."
      ),
      tags: ["bastar", "chhattisgarh"],
    }),
    row({
      id: "fallback-in-1",
      slug: "india-markets-brief-fallback",
      headline: "भारतीय बाजारों में सकारात्मक रुख, वैश्विक संकेत मिश्रित",
      summary: "वित्त मंत्रालय ने सूक्ष्म उद्यमों के लिए नई राहत योजना की समीक्षा की।",
      hero_image_url: EDITORIAL_IMAGES.civicOffice,
      translations: fallbackTranslations(
        "भारतीय बाजारों में सकारात्मक रुख, वैश्विक संकेत मिश्रित",
        "वित्त मंत्रालय ने सूक्ष्म उद्यमों के लिए नई राहत योजना की समीक्षा की।",
        "Indian markets trade positively amid mixed global cues",
        "The finance ministry is reviewing a new support plan for micro enterprises."
      ),
      tags: ["business", "india"],
    }),
    row({
      id: "fallback-in-2",
      slug: "sports-cricket-update-fallback",
      headline: "क्रिकेट: भारतीय टीम की तैयारी जारी, कोचिंग स्टाफ बैठक",
      summary: "आगामी श्रृंखला के लिए प्लेइंग इलेवन पर चर्चा हो सकती है।",
      hero_image_url: EDITORIAL_IMAGES.cricketGround,
      translations: fallbackTranslations(
        "क्रिकेट: भारतीय टीम की तैयारी जारी, कोचिंग स्टाफ बैठक",
        "आगामी श्रृंखला के लिए प्लेइंग इलेवन पर चर्चा हो सकती है।",
        "India continue preparations as coaching staff review the playing XI",
        "The team management is expected to discuss its line-up for the coming series."
      ),
      tags: ["sports", "india"],
    }),
    row({
      id: "fallback-in-3",
      slug: "tech-digital-india-fallback",
      headline: "डिजिटल इंडिया: ग्रामीण ब्रॉडबैंड कनेक्टिविटी में सुधार",
      summary: "दूरस्थ क्षेत्रों में 4G कवरेज विस्तार पर केंद्र का फोकस।",
      hero_image_url: EDITORIAL_IMAGES.newsroomDesk,
      translations: fallbackTranslations(
        "डिजिटल इंडिया: ग्रामीण ब्रॉडबैंड कनेक्टिविटी में सुधार",
        "दूरस्थ क्षेत्रों में 4G कवरेज विस्तार पर केंद्र का फोकस।",
        "Digital India drive improves rural broadband connectivity",
        "The government is focusing on expanding 4G coverage across remote areas."
      ),
      tags: ["technology", "india"],
    }),
    row({
      id: "fallback-in-4",
      slug: "health-monsoon-advisory-fallback",
      headline: "मानसून सलाह: डेंगू से बचाव के लिए सावधानी बरतें",
      summary: "स्वास्थ्य विभाग ने नगर निगमों को फॉगिंग अभियान तेज करने को कहा।",
      hero_image_url: EDITORIAL_IMAGES.waterCivic,
      translations: fallbackTranslations(
        "मानसून सलाह: डेंगू से बचाव के लिए सावधानी बरतें",
        "स्वास्थ्य विभाग ने नगर निगमों को फॉगिंग अभियान तेज करने को कहा।",
        "Monsoon advisory urges residents to take dengue precautions",
        "The health department has asked civic bodies to intensify fogging drives."
      ),
      tags: ["health", "india"],
    }),
    row({
      id: "fallback-in-5",
      slug: "politics-assembly-session-fallback",
      headline: "विधानसभा सत्र: किसान कर्ज माफी पर सदन में चर्चा",
      summary: "विपक्ष ने शीघ्र पूर्ण क्रियान्वयन की मांग की।",
      hero_image_url: EDITORIAL_IMAGES.assemblyPolitics,
      translations: fallbackTranslations(
        "विधानसभा सत्र: किसान कर्ज माफी पर सदन में चर्चा",
        "विपक्ष ने शीघ्र पूर्ण क्रियान्वयन की मांग की।",
        "Assembly debates implementation of the farm loan waiver",
        "The opposition has called for the scheme to be implemented in full without delay."
      ),
      tags: ["politics", "chhattisgarh"],
      editorial_metadata: { is_breaking: true, ai_confidence: 0.48 },
    }),
  ];

  const featuredDistricts = new Set(["raipur", "bilaspur", "bastar"]);
  const districtImages = [
    EDITORIAL_IMAGES.raipurCity,
    EDITORIAL_IMAGES.civicOffice,
    EDITORIAL_IMAGES.waterCivic,
    EDITORIAL_IMAGES.schoolIndia,
    EDITORIAL_IMAGES.ruralHealth,
  ];
  const districtDesk = CG_DISTRICTS.filter(
    (district) => !featuredDistricts.has(district.slug)
  ).map((district, index) => {
    const hindiHeadline = `${district.nameHi} जिला डेस्क: स्थानीय सेवाओं और जनहित अपडेट पर नजर`;
    const hindiSummary =
      "जन दर्पण जिला डेस्क प्रशासन, मौसम, यातायात और जनसेवा से जुड़ी सत्यापित सूचनाओं को एक जगह प्रस्तुत करता है।";
    const englishHeadline = `${district.name} district desk tracks civic services and local alerts`;
    const englishSummary =
      "Jan Darpan's district desk brings together verified updates on administration, weather, traffic and public services.";

    return row({
      id: `fallback-district-${district.slug}`,
      slug: `${district.slug}-district-desk-fallback`,
      headline: hindiHeadline,
      summary: hindiSummary,
      hero_image_url: districtImages[index % districtImages.length],
      translations: fallbackTranslations(
        hindiHeadline,
        hindiSummary,
        englishHeadline,
        englishSummary
      ),
      tags: [district.slug, district.name.toLowerCase(), "chhattisgarh", "local"],
    });
  });

  return [...featured, ...districtDesk];
}
