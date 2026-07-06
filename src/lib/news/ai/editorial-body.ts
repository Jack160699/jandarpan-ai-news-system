/**
 * Shared editorial body helpers — used by generation and repair passes.
 */

const TEMPLATE_SECTION_RE =
  /^##\s*(सारांश|मुख्य घटनाक्रम|क्षेत्रीय प्रभाव|पृष्ठभूमि|निष्कर्ष|summary|key developments|regional implications|background|conclusion)\s*$/im;

const ATTRIBUTION_RE =
  /(के अनुसार|अधिकारियों ने|पुलिस ने|प्रशासन ने|सूत्रों के अनुसार|according to|officials said|police said|witnesses said|sources said)/i;

const FILLER_SECTION_RE =
  /^##\s*(पृष्ठभूमि|क्षेत्रीय प्रभाव|निष्कर्ष|background|regional implications|conclusion)\s*$/im;

function normalizeComparableText(text: string): string {
  return text
    .replace(/^##[^\n]*\n+/gm, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** True when body text substantially repeats the dek/summary */
export function isDuplicateOfSummary(text: string, summary: string): boolean {
  const a = normalizeComparableText(text);
  const b = normalizeComparableText(summary);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 40 && b.length >= 40) {
    if (a.startsWith(b.slice(0, Math.min(80, b.length)))) return true;
    if (b.startsWith(a.slice(0, Math.min(80, a.length)))) return true;
  }
  return false;
}

export function stripTemplateHeadings(text: string): string {
  return text
    .split("\n")
    .filter((line) => !TEMPLATE_SECTION_RE.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripDuplicateSummaryFromBody(body: string, summary: string): string {
  const paragraphs = body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!paragraphs.length) return body.trim();

  const filtered = paragraphs.filter(
    (p) => !isDuplicateOfSummary(p.replace(/^##[^\n]*\n+/m, ""), summary)
  );

  return (filtered.length ? filtered : paragraphs).join("\n\n");
}

export function analyzeEditorialBody(body: string, summary: string) {
  const sections = body.split(/\n##\s+/).filter(Boolean);
  const templateSectionCount = (body.match(/^##\s+/gm) ?? []).length;
  const fillerSectionCount = sections.filter((s) =>
    FILLER_SECTION_RE.test(`## ${s.split("\n")[0] ?? ""}`)
  ).length;
  const firstPara = body.replace(/^##[^\n]*\n+/m, "").split(/\n{2,}/)[0] ?? "";
  const wordCount = body.split(/\s+/).filter(Boolean).length;

  return {
    templateSectionCount,
    fillerSectionCount,
    hasDuplicateSummary: isDuplicateOfSummary(firstPara, summary),
    hasAttribution: ATTRIBUTION_RE.test(body),
    wordCount,
  };
}

export type LlmEditorialSections = {
  lead?: string;
  details?: string;
  context?: string;
  intro?: string;
  key_developments?: string;
  regional_implications?: string;
  background?: string;
  conclusion?: string;
};

export function assembleEditorialBody(
  sections: LlmEditorialSections,
  summary: string
): string {
  const lead = stripTemplateHeadings((sections.lead ?? sections.intro ?? "").trim());
  const details = stripTemplateHeadings(
    (sections.details ?? sections.key_developments ?? "").trim()
  );
  const context = stripTemplateHeadings(
    (sections.context ?? sections.background ?? "").trim()
  );

  const parts: string[] = [];

  if (lead && !isDuplicateOfSummary(lead, summary)) {
    parts.push(lead);
  }
  if (details && !isDuplicateOfSummary(details, summary)) {
    parts.push(details);
  }
  if (context && !isDuplicateOfSummary(context, summary)) {
    parts.push(context);
  }

  return parts.join("\n\n");
}
