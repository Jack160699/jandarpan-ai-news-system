/**
 * SEO Intelligence — text tokenization, similarity, entity helpers
 */

import { CG_DISTRICTS } from "@/lib/regional/districts";
import type { EntityType } from "@/lib/seo-intelligence/types";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "news",
  "live",
  "update",
  "की",
  "के",
  "का",
  "को",
  "में",
  "से",
  "पर",
  "और",
  "एक",
  "है",
  "हैं",
  "था",
  "थी",
  "थे",
  "ने",
  "भी",
  "तो",
  "ही",
  "जो",
  "कि",
  "समाचार",
  "खबर",
  "नई",
  "ताजा",
]);

const POWER_WORDS = [
  "ब्रेकिंग",
  "breaking",
  "ताजा",
  "बड़ी",
  "अलर्ट",
  "exclusive",
  "live",
  "लाइव",
  "खुलासा",
  "जबरदस्त",
  "धमाका",
  "अहम",
  "महत्वपूर्ण",
];

const SCHEME_PATTERNS = [/योजना/i, /scheme/i, /मिशन/i, /अभियान/i];
const ORG_PATTERNS = [/विभाग/i, /मंत्रालय/i, /कॉर्पोरेशन/i, /बोर्ड/i, /department/i];

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function detectDistrictInText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const district of CG_DISTRICTS) {
    for (const alias of district.aliases) {
      if (lower.includes(alias.toLowerCase())) return district.slug;
    }
    if (lower.includes(district.name.toLowerCase())) return district.slug;
    if (lower.includes(district.nameHi)) return district.slug;
  }
  return null;
}

export function classifyEntity(keyword: string): EntityType {
  if (SCHEME_PATTERNS.some((p) => p.test(keyword))) return "scheme";
  if (ORG_PATTERNS.some((p) => p.test(keyword))) return "organization";
  if (detectDistrictInText(keyword)) return "location";
  if (/^[A-Z][a-z]+/.test(keyword) || /^(श्री|डॉ|श्रीमती)/.test(keyword)) {
    return "person";
  }
  return "keyword";
}

export function extractTopKeywords(text: string, limit = 5): string[] {
  const freq = new Map<string, number>();
  for (const token of tokenize(text)) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

export function hasPowerWords(text: string): number {
  const lower = text.toLowerCase();
  return POWER_WORDS.filter((w) => lower.includes(w.toLowerCase())).length;
}

export function hasBreakingPrefix(text: string): boolean {
  return /^(ब्रेकिंग|breaking|ताजा|live|लाइव)/i.test(text.trim());
}

export function keywordPosition(text: string, keyword: string): number | null {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  return idx >= 0 ? idx : null;
}

export function isToday(iso: string | null, now = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function clusterKeyFromKeywords(keywords: string[]): string {
  return keywords
    .slice(0, 3)
    .sort()
    .join("|")
    .toLowerCase();
}
