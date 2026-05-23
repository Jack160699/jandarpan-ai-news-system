/**
 * Public-facing desk labels — never expose raw provider names (RSS, GNews, etc.)
 */

export type NewsDeskId = "cg-ai-desk" | "regional-bureau" | "live-desk";

export type NewsDeskLabel = {
  id: NewsDeskId;
  name: string;
  nameHi: string;
};

export const NEWS_DESKS: Record<NewsDeskId, NewsDeskLabel> = {
  "cg-ai-desk": {
    id: "cg-ai-desk",
    name: "CG Bhaskar AI Desk",
    nameHi: "सीजी भास्कर AI डेस्क",
  },
  "regional-bureau": {
    id: "regional-bureau",
    name: "Regional Bureau",
    nameHi: "क्षेत्रीय ब्यूरो",
  },
  "live-desk": {
    id: "live-desk",
    name: "Live Desk",
    nameHi: "लाइव डेस्क",
  },
};

const HIDDEN_PROVIDER_RE =
  /google\s*news|gnews|newsdata|news\s*data|\brss\b|feed\b|aggregator/i;

const HIDDEN_SOURCE_RE =
  /google\s*news|gnews|newsdata|rss\s*feed|news\s*aggregator/i;

/** Strip raw provider/source strings from UI */
export function sanitizePublicSourceName(
  value: string | null | undefined
): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  if (HIDDEN_SOURCE_RE.test(v) || HIDDEN_PROVIDER_RE.test(v)) return null;
  return v;
}

export function resolveDeskForCardVariant(
  variant: "editorial" | "wire" | "breaking"
): NewsDeskLabel {
  switch (variant) {
    case "wire":
      return NEWS_DESKS["live-desk"];
    case "breaking":
      return NEWS_DESKS["live-desk"];
    case "editorial":
    default:
      return NEWS_DESKS["cg-ai-desk"];
  }
}

/** Regional CG stories use Regional Bureau on editorial cards */
export function resolveEditorialDesk(
  section: string,
  isRegional?: boolean
): NewsDeskLabel {
  if (
    isRegional ||
    section === "chhattisgarh" ||
    section === "raipur"
  ) {
    return NEWS_DESKS["regional-bureau"];
  }
  return NEWS_DESKS["cg-ai-desk"];
}

export function mapProviderToDesk(provider: string | null | undefined): NewsDeskLabel {
  const p = (provider ?? "").toLowerCase();
  if (p === "editorial" || p === "generated") {
    return NEWS_DESKS["cg-ai-desk"];
  }
  if (p === "rss" || p === "gnews" || p === "newsdata") {
    return NEWS_DESKS["regional-bureau"];
  }
  return NEWS_DESKS["live-desk"];
}

export function displaySourceLine(
  desk: NewsDeskLabel,
  fallbackSource: string | null | undefined
): string {
  const clean = sanitizePublicSourceName(fallbackSource);
  return clean ?? desk.name;
}
