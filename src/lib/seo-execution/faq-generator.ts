/**
 * Module 5 — FAQ Generator
 */

import { getPrimaryKeyword } from "@/lib/seo-intelligence/keywords";
import type { ExecutionArticle, SuggestionDraft } from "@/lib/seo-execution/types";

export interface FaqItem {
  question: string;
  answer: string;
}

export function buildFaqSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function generateFaqSuggestions(
  article: ExecutionArticle
): SuggestionDraft[] {
  const hasFaq = Boolean(article.editorial_metadata?.faq);
  if (hasFaq) return [];

  const keyword = getPrimaryKeyword(article.headline) ?? article.headline.slice(0, 40);
  const district = article.district ?? "छत्तीसगढ़";
  const summary = article.summary ?? article.headline;

  const faqs: FaqItem[] = [
    {
      question: `${keyword} से जुड़ी मुख्य खबर क्या है?`,
      answer: summary.slice(0, 280),
    },
    {
      question: `यह घटना ${district} में कहाँ हुई?`,
      answer: `${district} से संबंधित यह खबर Jandarpan News द्वारा प्रकाशित की गई है। विस्तृत जानकारी ऊपर दी गई है।`,
    },
    {
      question: "इस खबर का स्रोत क्या है?",
      answer:
        "यह रिपोर्ट Jandarpan News की संपादकीय टीम द्वारा सत्यापित स्रोतों के आधार पर तैयार की गई है।",
    },
  ];

  if (article.word_count < 250) {
    faqs.push({
      question: "आगे क्या अपडेट आ सकता है?",
      answer: "इस खबर पर नई जानकारी मिलते ही अपडेट किया जाएगा।",
    });
  }

  const qualityScore = Math.min(
    95,
    60 + faqs.length * 8 + (summary.length > 100 ? 10 : 0)
  );

  const schema = buildFaqSchema(faqs);

  return [
    {
      suggestion_type: "faq",
      field_key: "faq_schema",
      current_value: null,
      suggested_value: JSON.stringify({ faqs, schema, qualityScore }),
      reason: "No FAQ section detected — People Also Ask and featured snippet opportunity.",
      expected_impact: "FAQ rich results and PAA visibility (+10–20% organic CTR potential)",
      confidence: 0.8,
      priority: "high",
      metadata: { faqs, schema, qualityScore },
    },
  ];
}
