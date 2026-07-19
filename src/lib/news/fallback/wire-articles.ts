/**
 * Static Hindi/India wire fallback — shown when DB + APIs are unavailable.
 * Keeps ticker and cards populated in production without layout changes.
 */

import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const NOW = () => new Date().toISOString();

function bodyFrom(summary: string | null, headline: string): string {
  const lead = summary?.trim() || headline;
  return [
    lead,
    "स्थानीय प्रशासन और संबंधित विभागों से प्राप्त जानकारी के आधार पर यह रिपोर्ट तैयार की गई है। आगे की स्थिति स्पष्ट होते ही अपडेट जारी किए जाएँगे।",
    "जनदर्पण टीम मैदान से रिपोर्टिंग जारी रखेगी और पाठकों को सत्यापित अपडेट उपलब्ध कराती रहेगी।",
  ].join("\n\n");
}

function row(
  partial: Pick<GeneratedArticleRow, "id" | "slug" | "headline" | "summary"> &
    Partial<GeneratedArticleRow>
): GeneratedArticleRow {
  const summary = partial.summary ?? null;
  return {
    event_id: null,
    article_body: bodyFrom(summary, partial.headline),
    hero_image_url: null,
    seo_title: partial.headline,
    seo_description: summary,
    reading_time: "3 मिनट",
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
    article_body: partial.article_body ?? bodyFrom(summary, partial.headline),
  };
}

/** Curated desk headlines — rotate-safe slugs for /story routes */
export function getStaticFallbackArticlePool(): GeneratedArticleRow[] {
  return [
    row({
      id: "fallback-cg-1",
      slug: "raipur-metro-update-fallback",
      headline: "रायपुर: शहर में आज मौसम सामान्य रहेगा, यातायात सुचारू",
      summary:
        "स्थानीय प्रशासन ने शाम के समय भारी वाहनों के लिए वैकल्पिक मार्ग जारी किए हैं।",
      tags: ["raipur", "chhattisgarh"],
      editorial_metadata: { is_breaking: true, ai_confidence: 0.5 },
    }),
    row({
      id: "fallback-cg-2",
      slug: "bilaspur-power-grid-fallback",
      headline: "बिलासपुर: बिजली आपूर्ति स्थिर, रखरखाव कार्य पूरा",
      summary: "उपभोक्ताओं को अगले 24 घंटे में नियोजित कटौती की संभावना नहीं।",
      tags: ["bilaspur", "chhattisgarh"],
    }),
    row({
      id: "fallback-cg-3",
      slug: "bastar-health-camp-fallback",
      headline: "बस्तर: मोबाइल स्वास्थ्य शिविर में हजारों लाभार्थी",
      summary: "जिला अस्पताल ने मुफ्त जांच शिविर का विस्तार किया है।",
      tags: ["bastar", "chhattisgarh"],
    }),
    row({
      id: "fallback-in-1",
      slug: "india-markets-brief-fallback",
      headline: "भारतीय बाजारों में सकारात्मक रुख, वैश्विक संकेत मिश्रित",
      summary: "वित्त मंत्रालय ने सूक्ष्म उद्यमों के लिए नई राहत योजना की समीक्षा की।",
      tags: ["business", "india"],
    }),
    row({
      id: "fallback-in-2",
      slug: "sports-cricket-update-fallback",
      headline: "क्रिकेट: भारतीय टीम की तैयारी जारी, कोचिंग स्टाफ बैठक",
      summary: "आगामी श्रृंखला के लिए प्लेइंग इलेवन पर चर्चा हो सकती है।",
      tags: ["sports", "india"],
    }),
    row({
      id: "fallback-in-3",
      slug: "tech-digital-india-fallback",
      headline: "डिजिटल इंडिया: ग्रामीण ब्रॉडबैंड कनेक्टिविटी में सुधार",
      summary: "दूरस्थ क्षेत्रों में 4G कवरेज विस्तार पर केंद्र का फोकस।",
      tags: ["technology", "india"],
    }),
    row({
      id: "fallback-in-4",
      slug: "health-monsoon-advisory-fallback",
      headline: "मानसून सलाह: डेंगू से बचाव के लिए सावधानी बरतें",
      summary: "स्वास्थ्य विभाग ने नगर निगमों को फॉगिंग अभियान तेज करने को कहा।",
      tags: ["health", "india"],
    }),
    row({
      id: "fallback-in-5",
      slug: "politics-assembly-session-fallback",
      headline: "विधानसभा सत्र: किसान कर्ज माफी पर सदन में चर्चा",
      summary: "विपक्ष ने शीघ्र पूर्ण क्रियान्वयन की मांग की।",
      tags: ["politics", "chhattisgarh"],
      editorial_metadata: { is_breaking: true, ai_confidence: 0.48 },
    }),
  ];
}
