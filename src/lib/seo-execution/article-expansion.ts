/**
 * Module 6 — Article Expansion (paragraph suggestions only)
 */

import type { ExecutionArticle, IntelligenceContext, SuggestionDraft } from "@/lib/seo-execution/types";

export function generateExpansionSuggestions(
  article: ExecutionArticle,
  context: IntelligenceContext
): SuggestionDraft[] {
  const suggestions: SuggestionDraft[] = [];
  const body = article.article_body ?? "";
  const sections = body.split(/\n{2,}/).filter(Boolean);

  if (article.word_count < 200) {
    suggestions.push({
      suggestion_type: "expansion",
      field_key: "suggested_expansion",
      current_value: `${article.word_count} words`,
      suggested_value: `पृष्ठभूमि: ${article.district ?? "छत्तीसगढ़"} में इस घटना का संदर्भ पाठकों के लिए महत्वपूर्ण है। ${article.summary ?? ""} इस मामले पर अधिकारियों की प्रतिक्रिया और आगे की कार्रवाई पर नज़र रखी जा रही है।`,
      reason: "Article under 200 words — thin content for competitive SERP rankings.",
      expected_impact: "Improved depth score and time-on-page",
      confidence: 0.82,
      priority: "high",
      metadata: { gap_type: "missing_background" },
    });
  }

  if (!body.match(/आंकड़े|प्रतिशत|statistics|\d+%/i)) {
    suggestions.push({
      suggestion_type: "expansion",
      field_key: "suggested_expansion_stats",
      current_value: null,
      suggested_value:
        "संबंधित आंकड़ों के अनुसार, इस क्षेत्र में पिछले वर्ष की तुलना में गतिविधि में बदलाव देखा गया है। विस्तृत आंकड़े जल्द ही अपडेट किए जाएंगे।",
      reason: "Missing statistics or data points — competitors often include numbers.",
      expected_impact: "Higher E-E-A-T signals and snippet eligibility",
      confidence: 0.7,
      priority: "medium",
      metadata: { gap_type: "missing_statistics" },
    });
  }

  if (sections.length < 3) {
    suggestions.push({
      suggestion_type: "expansion",
      field_key: "suggested_expansion_sections",
      current_value: `${sections.length} sections`,
      suggested_value:
        "मुख्य बातें:\n• घटना का सारांश\n• प्रशासनिक प्रतिक्रिया\n• अगले कदम\n\nसंदर्भ: इस खबर से जुड़े पिछले विकास भी पाठकों के लिए उपयोगी हो सकते हैं।",
      reason: "Few content sections — add structured H2 blocks for readability.",
      expected_impact: "Better readability and featured snippet structure",
      confidence: 0.75,
      priority: "medium",
      metadata: { gap_type: "missing_sections" },
    });
  }

  if (context.competitorHeadlines.length > 0 && article.word_count < 400) {
    suggestions.push({
      suggestion_type: "expansion",
      field_key: "suggested_expansion_context",
      current_value: null,
      suggested_value: `प्रतिस्पर्धी कवरेज में इस विषय पर अतिरिक्त संदर्भ शामिल है। ${context.competitorHeadlines[0]?.slice(0, 80) ?? ""} से जुड़े पहलू पाठकों को पूरी तस्वीर समझने में मदद करेंगे।`,
      reason: "Competitor coverage suggests additional context is available.",
      expected_impact: "Close content gap vs competitors",
      confidence: 0.68,
      priority: "medium",
      metadata: { gap_type: "missing_context", competitor_sample: context.competitorHeadlines[0] },
    });
  }

  return suggestions;
}
