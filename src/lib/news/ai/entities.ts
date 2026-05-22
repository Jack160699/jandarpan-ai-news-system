/**
 * Lightweight named-entity extraction for clustering (no external NLP deps)
 */

const PLACES = new Set([
  "raipur",
  "bilaspur",
  "bastar",
  "durg",
  "bhilai",
  "korba",
  "jagdalpur",
  "raigarh",
  "ambikapur",
  "chhattisgarh",
  "छत्तीसगढ",
  "छत्तीसगढ़",
  "रायपुर",
  "बिलासपुर",
  "बस्तर",
  "दुर्ग",
  "भिलाई",
  "india",
  "delhi",
  "mumbai",
  "patna",
]);

const ORG_SUFFIXES = /\b(ministry|government|court|police|election|commission|party|cabinet)\b/i;

export function extractNamedEntities(text: string): Set<string> {
  const entities = new Set<string>();
  const lower = text.toLowerCase();

  for (const place of PLACES) {
    if (lower.includes(place)) entities.add(place);
  }

  const caps = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/g) ?? [];
  for (const phrase of caps) {
    const norm = phrase.toLowerCase().trim();
    if (norm.length > 2 && !STOPWORDS.has(norm)) {
      entities.add(norm);
    }
  }

  if (ORG_SUFFIXES.test(lower)) {
    const m = lower.match(ORG_SUFFIXES);
    if (m) entities.add(m[0].toLowerCase());
  }

  return entities;
}

export function entityOverlapRatio(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const e of a) {
    if (b.has(e)) inter++;
  }
  return inter / Math.max(a.size, b.size);
}

const STOPWORDS = new Set(["news", "live", "update", "india", "state"]);
