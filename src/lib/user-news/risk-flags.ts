/**
 * Moderation risk flags for user-submitted news.
 *
 * Deterministic and conservative: these are heuristics that tell a human moderator WHERE to look. They never publish or reject
 * anything on their own, and a clean result is not an endorsement. Every flag carries the evidence that triggered it, so a moderator
 * can judge it in seconds.
 *
 * Severity:
 *   block   the story cannot be submitted as written (personal data exposure, explicit sexual content)
 *   review  the story may be submitted, but a moderator must make an explicit decision about this flag
 *   info    context for the moderator
 *
 * Accusations about identifiable people: a story that states a named person committed a crime AS FACT, with no attribution
 * ("alleged", "police said", "आरोप"), is flagged for review. It must be rewritten as an allegation or backed by evidence.
 */

export const RISK_CODES = [
  "misinformation_risk",
  "harmful_accusation",
  "defamatory_claim",
  "violence",
  "sexual_content",
  "personal_data_exposure",
  "manipulated_media",
  "copyright_problem",
  "spam",
  "duplicate",
  "unverifiable_claim",
] as const;
export type RiskCode = (typeof RISK_CODES)[number];

export type RiskFlag = { code: RiskCode; severity: "block" | "review" | "info"; evidence: string };

const UNICODE_LETTERS = /\p{L}/u;

const CRIME = "murder|rape|rapist|molest|theft|thief|robbery|fraud|scam|corrupt|bribe|bribery|kidnap|assault|killed|stole|cheated|embezzl|चोरी|चोर|हत्या|हत्यारा|बलात्कार|घोटाला|भ्रष्ट|रिश्वत|धोखाधड़ी|ठगी|अपहरण|लूट|मारपीट|छेड़छाड़|कत्ल";
const HEDGE = /(alleged(ly)?|accused|suspect(ed)?|claim(s|ed)?|according to|police said|reportedly|आरोप|आरोपी|कथित|संदिग्ध|के अनुसार|पुलिस के अनुसार|बताया जा रहा|माना जा रहा|दावा)/i;
// "<Name> is a thief", "<Name> ने चोरी की", "<Name> killed ..."
const NAMED_ASSERTION = new RegExp(
  `(\\b[A-Z][a-z]{2,}(?:\\s+[A-Z][a-z]{2,})?\\b\\s+(?:is|was|has|had|committed|did)?\\s*(?:a\\s+)?(?:${CRIME})\\b)|([\\p{L}\\p{M}]{3,}(?:\\s+[\\p{L}\\p{M}]{3,})?\\s+(?:ने|ही)\\s+(?:${CRIME}))|([\\p{L}\\p{M}]{3,}\\s+(?:एक\\s+)?(?:${CRIME})\\s+(?:है|था))`,
  "iu"
);

const VIOLENCE = /(murder|killed|stabbed|shot dead|beheaded|lynch|mob violence|blood|बलात्कार|हत्या|मार डाला|चाकू|गोली मार|खून|लिंचिंग|कत्ल)/i;
const SEXUAL = /(\bsex\b|nude|naked|porn|xxx|intercourse|अश्लील|नग्न|नंगा|यौन संबंध|पोर्न)/i;
// Indian mobile numbers, with or without +91 and with the common 5+5 grouping ("98765 43210").
const PHONE = /(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const GOVT_ID = /(?<!\d)\d{4}[\s-]?\d{4}[\s-]?\d{4}(?!\d)|\b[A-Z]{5}\d{4}[A-Z]\b/;
const URL = /https?:\/\/\S+|www\.\S+/gi;
const PROMO = /(whatsapp|telegram|call now|click here|subscribe|follow us|limited offer|discount|मुफ्त|ऑफर|संपर्क करें|कॉल करें|व्हाट्सएप)/i;
const UNVERIFIABLE = /(viral (message|video|post)|forwarded|rumou?r|people are saying|sources say|सूत्रों के अनुसार|वायरल (मैसेज|वीडियो|पोस्ट)|अफवाह|कहा जा रहा है कि)/i;
const MISINFO = /(100% (cure|guaranteed)|miracle cure|doctors don'?t want|they are hiding|cover[- ]?up|शर्तिया इलाज|चमत्कारी|सरकार छिपा रही|साजिश का खुलासा)/i;

function snippet(text: string, re: RegExp): string {
  const m = text.match(re);
  if (!m || m.index === undefined) return "";
  const start = Math.max(0, m.index - 20);
  return text.slice(start, Math.min(text.length, m.index + m[0].length + 20)).replace(/\s+/g, " ").trim();
}

export type RiskInput = {
  text: string;
  /** Recent published headlines, to detect a duplicate story. */
  recentHeadlines?: readonly string[];
  headline?: string;
  hasMedia?: boolean;
  /** Set when media failed validation or looks manipulated/edited (from the media pipeline). */
  mediaIssues?: readonly string[];
  /** Strings the submission is known to quote verbatim from elsewhere (for a copyright signal). */
  copiedFrom?: readonly string[];
};

export function detectRiskFlags(input: RiskInput): RiskFlag[] {
  const text = input.text ?? "";
  const flags: RiskFlag[] = [];
  const add = (code: RiskCode, severity: RiskFlag["severity"], evidence: string) => flags.push({ code, severity, evidence });

  // Personal data exposure: block, the platform must not publish someone's phone number, email or ID.
  if (PHONE.test(text)) add("personal_data_exposure", "block", `phone number: ${snippet(text, PHONE)}`);
  if (EMAIL.test(text)) add("personal_data_exposure", "block", `email address: ${snippet(text, EMAIL)}`);
  if (GOVT_ID.test(text)) add("personal_data_exposure", "block", `government-ID-like number: ${snippet(text, GOVT_ID)}`);

  if (SEXUAL.test(text)) add("sexual_content", "block", snippet(text, SEXUAL));
  if (VIOLENCE.test(text)) add("violence", "review", snippet(text, VIOLENCE));

  // Accusation about an identifiable person stated as fact.
  const accusation = text.match(NAMED_ASSERTION);
  if (accusation) {
    const around = snippet(text, NAMED_ASSERTION);
    if (!HEDGE.test(around) && !HEDGE.test(text.slice(Math.max(0, (accusation.index ?? 0) - 60), (accusation.index ?? 0) + accusation[0].length + 60))) {
      add("harmful_accusation", "review", around);
      add("defamatory_claim", "review", `states a named person committed a crime as fact: ${around}`);
    }
  }

  if (UNVERIFIABLE.test(text)) add("unverifiable_claim", "review", snippet(text, UNVERIFIABLE));
  if (MISINFO.test(text)) add("misinformation_risk", "review", snippet(text, MISINFO));

  // Spam: links, promotion, repetition.
  const urls = text.match(URL) ?? [];
  if (urls.length >= 2) add("spam", "review", `${urls.length} links`);
  else if (PROMO.test(text)) add("spam", "review", snippet(text, PROMO));
  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && UNICODE_LETTERS.test(w));
  if (words.length >= 20) {
    const counts = new Map<string, number>();
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
    const [top, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]!;
    if (n / words.length > 0.25) add("spam", "review", `"${top}" repeated ${n} times`);
  }

  // Duplicate of a recent story (same headline words).
  if (input.headline && input.recentHeadlines?.length) {
    const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    const mine = new Set(norm(input.headline).split(" ").filter((w) => w.length >= 3));
    for (const other of input.recentHeadlines) {
      const theirs = new Set(norm(other).split(" ").filter((w) => w.length >= 3));
      if (mine.size === 0 || theirs.size === 0) continue;
      let inter = 0;
      for (const w of mine) if (theirs.has(w)) inter++;
      const sim = inter / (mine.size + theirs.size - inter);
      if (sim >= 0.7) {
        add("duplicate", "review", `similar to an existing headline: "${other}"`);
        break;
      }
    }
  }

  for (const issue of input.mediaIssues ?? []) add("manipulated_media", "review", issue);
  for (const c of input.copiedFrom ?? []) add("copyright_problem", "review", `matches text from ${c}`);

  return flags;
}

export const hasBlockingRisk = (flags: readonly RiskFlag[]) => flags.some((f) => f.severity === "block");
export const needsModeratorDecision = (flags: readonly RiskFlag[]) => flags.some((f) => f.severity !== "info");
