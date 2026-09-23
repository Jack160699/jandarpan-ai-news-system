import { NextRequest, NextResponse } from "next/server";
import { generate60SecondSummary } from "@/lib/news/shorts/summarize";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { HomeSectionId } from "@/lib/homepage/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ScriptRequest = {
  id: string;
  headline: string;
  summary: string;
  section: string;
  language: "hi" | "en";
  isBreaking?: boolean;
  district?: string | null;
};

const cache = new Map<string, { script: string; durationSec: number; ts: number }>();
const CACHE_TTL = 3600_000; // 1 hour

export async function POST(req: NextRequest) {
  let body: ScriptRequest;
  try {
    body = await req.json() as ScriptRequest;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { id, headline, summary, section, language, isBreaking, district } = body;
  if (!headline || !summary) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const cacheKey = `${id}:${language}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ script: cached.script, durationSec: cached.durationSec });
  }

  const lang = (language || "hi") as NewsroomLanguage;
  const safeSection = (section || "chhattisgarh") as HomeSectionId;

  // Prefix breaking news in the headline if applicable
  const enrichedHeadline = isBreaking
    ? (lang === "hi" ? `ब्रेकिंग: ${headline}` : `Breaking: ${headline}`)
    : headline;

  // Build a location-enriched summary for the anchor
  const locationPrefix = district
    ? lang === "hi"
      ? `${district} से — `
      : `From ${district} — `
    : "";
  const enrichedSummary = `${locationPrefix}${summary}`;

  const result = await generate60SecondSummary({
    headline: enrichedHeadline,
    summary: enrichedSummary,
    section: safeSection,
    language: lang,
  });

  if (!result) {
    // Fallback
    const fallback = buildFallbackScript(enrichedHeadline, enrichedSummary, lang, isBreaking);
    return NextResponse.json(fallback);
  }

  const out = { script: result.script, durationSec: result.durationSec };
  cache.set(cacheKey, { ...out, ts: Date.now() });

  return NextResponse.json(out, {
    headers: {
      "Cache-Control": "private, max-age=3600",
    },
  });
}

function buildFallbackScript(
  headline: string,
  summary: string,
  lang: NewsroomLanguage,
  isBreaking?: boolean
): { script: string; durationSec: number } {
  let script: string;
  if (lang === "hi") {
    script = isBreaking
      ? `ब्रेकिंग न्यूज़। ${headline}। ${summary}। जन दर्पण लाइव पर बने रहें।`
      : `नमस्कार, जन दर्पण लाइव में आपका स्वागत है। ${headline}। ${summary}। ताज़ा खबरों के लिए जन दर्पण के साथ बने रहें।`;
  } else {
    script = isBreaking
      ? `Breaking news. ${headline}. ${summary}. Stay with Jan Darpan Live.`
      : `Welcome to Jan Darpan Live. ${headline}. ${summary}. Stay with us for the latest.`;
  }
  return { script, durationSec: Math.ceil(script.length / 14) };
}
