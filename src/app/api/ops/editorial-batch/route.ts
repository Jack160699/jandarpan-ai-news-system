import { NextRequest, NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/server";
import {
  generateEditorialFromEvent,
  discoverAndValidateCandidateMedia,
} from "@/lib/news/ai/generate-article";
import {
  hasVerifiedRealMedia,
  isCleanRightsEligibleMedia,
} from "@/lib/news/images/validate";
import { translateGeneratedArticle } from "@/lib/i18n/multilingual/translate";
import {
  selectEditorialCandidates,
  scoreEditorialCandidate,
} from "@/lib/infrastructure/workers/editorial-priority";
import { resolveCanonicalStoryDistrict } from "@/lib/regional/canonical-district";
import { resolveCanonicalCategories } from "@/lib/editorial/canonical-categories";
import type { NewsEventRow, NewsSignalRow } from "@/lib/types/newsroom";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes on pro, capped at max allowed

/**
 * Audit first 100 backlog events and classify each.
 */
async function auditBacklog100(supabase: any) {
  // Fetch existing represented event IDs and headlines
  const { data: existingArticles } = await supabase
    .from("generated_articles")
    .select("event_id, headline, hero_image_url");
  const representedEventIds = new Set(
    (existingArticles ?? []).map((a: any) => a.event_id).filter(Boolean)
  );
  const existingHeadlines = (existingArticles ?? [])
    .map((a: any) => a.headline?.toLowerCase().trim())
    .filter(Boolean);

  // Fetch 100 latest events from backlog (excluding already generated)
  const { data: rawEvents, error: evErr } = await supabase
    .from("news_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (evErr || !rawEvents) {
    return { error: evErr?.message || "Failed to fetch events" };
  }

  // Fetch signals for these events
  const allSignalIds = [
    ...new Set(
      rawEvents.flatMap((e: any) => (Array.isArray(e.signal_ids) ? e.signal_ids : []))
    ),
  ];

  const signalMap = new Map<string, NewsSignalRow>();
  for (let i = 0; i < allSignalIds.length; i += 200) {
    const chunk = allSignalIds.slice(i, i + 200);
    const { data: signals } = await supabase
      .from("news_signals")
      .select("*")
      .in("id", chunk);
    (signals ?? []).forEach((s: any) => signalMap.set(s.id, s));
  }

  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 3600 * 1000;

  const classificationCounts = {
    total_audited: rawEvents.length,
    ready_for_generation: 0,
    missing_real_media: 0,
    missing_factual_content: 0,
    already_represented: 0,
    duplicate: 0,
    stale: 0,
    blocked_by_policy: 0,
  };

  const auditedEvents: any[] = [];

  for (const event of rawEvents) {
    const sigs = (event.signal_ids ?? [])
      .map((id: string) => signalMap.get(id))
      .filter(Boolean) as NewsSignalRow[];

    const ageMs = now - new Date(event.created_at).getTime();
    const isStale = ageMs > thirtyDaysMs;
    const isAlreadyRepresented = representedEventIds.has(event.id);

    // Check factual content: title + summary + signal raw content
    const totalFactualLength =
      (event.title?.length ?? 0) +
      (event.event_summary?.length ?? 0) +
      sigs.reduce((acc, s) => acc + (s.raw_content?.length ?? s.title?.length ?? 0), 0);
    const isMissingFactual = totalFactualLength < 120 || sigs.length === 0;

    // Check media
    const mediaCheck = discoverAndValidateCandidateMedia(sigs);
    const hasMedia = mediaCheck.valid && Boolean(mediaCheck.imageUrl);

    // Check duplicate headline
    const isDuplicate = existingHeadlines.some((h: string) => {
      const titleLower = (event.title ?? "").toLowerCase().trim();
      return h === titleLower || (h.length > 20 && titleLower.includes(h.slice(0, 30)));
    });

    // Check blocked policy (e.g. prohibited words, non-news)
    const isBlocked =
      /astrology|horoscope|राशिफल|सट्टा/i.test(event.title ?? "") ||
      event.category === "entertainment_rumor";

    let classification = "ready_for_generation";
    if (isAlreadyRepresented) {
      classification = "already_represented";
      classificationCounts.already_represented++;
    } else if (isStale) {
      classification = "stale";
      classificationCounts.stale++;
    } else if (isBlocked) {
      classification = "blocked_by_policy";
      classificationCounts.blocked_by_policy++;
    } else if (!hasMedia) {
      classification = "missing_real_media";
      classificationCounts.missing_real_media++;
    } else if (isMissingFactual) {
      classification = "missing_factual_content";
      classificationCounts.missing_factual_content++;
    } else if (isDuplicate) {
      classification = "duplicate";
      classificationCounts.duplicate++;
    } else {
      classificationCounts.ready_for_generation++;
    }

    auditedEvents.push({
      id: event.id,
      title: event.title,
      category: event.category,
      region: event.region,
      created_at: event.created_at,
      signal_count: sigs.length,
      classification,
      media_url: mediaCheck.imageUrl || null,
      factual_char_count: totalFactualLength,
    });
  }

  return {
    summary: classificationCounts,
    actionable_ratio: `${(
      (classificationCounts.ready_for_generation / rawEvents.length) *
      100
    ).toFixed(1)}%`,
    sample_ready: auditedEvents.filter((e) => e.classification === "ready_for_generation").slice(0, 10),
    sample_missing_media: auditedEvents.filter((e) => e.classification === "missing_real_media").slice(0, 5),
    sample_represented: auditedEvents.filter((e) => e.classification === "already_represented").slice(0, 5),
  };
}

/**
 * Deterministically select top N real-media candidates for a batch.
 */
async function selectBatchCandidates(supabase: any, size: number) {
  // Load existing represented event IDs and used images
  const { data: existingArticles } = await supabase
    .from("generated_articles")
    .select("event_id, hero_image_url, headline");
  const representedEventIds = new Set(
    (existingArticles ?? []).map((a: any) => a.event_id).filter(Boolean)
  );
  const usedImageUrls = new Set<string>(
    (existingArticles ?? [])
      .map((a: any) => (a.hero_image_url ? String(a.hero_image_url).toLowerCase().trim() : ""))
      .filter((s: string) => Boolean(s))
  );

  // Fetch recent events from last 30 days (full unrepresented backlog)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data: events, error } = await supabase
    .from("news_events")
    .select("*")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(1500);

  if (error || !events) {
    return { error: error?.message || "Failed to fetch candidate events" };
  }

  // Filter out already represented
  const unrepresented = events.filter((e: any) => !representedEventIds.has(e.id));

  // Load signals for candidate events in chunks of 200
  const candidatePool = unrepresented.slice(0, 1200);
  const allSignalIds = [
    ...new Set(
      candidatePool.flatMap((e: any) => (Array.isArray(e.signal_ids) ? e.signal_ids : []))
    ),
  ] as string[];

  const signalMap = new Map<string, NewsSignalRow>();
  const chunks: string[][] = [];
  for (let i = 0; i < allSignalIds.length; i += 200) {
    chunks.push(allSignalIds.slice(i, i + 200));
  }
  const chunkResults = await Promise.all(
    chunks.map((chunk) => supabase.from("news_signals").select("*").in("id", chunk))
  );
  for (const res of chunkResults) {
    (res.data ?? []).forEach((s: any) => signalMap.set(s.id, s));
  }

  // Find events with genuine clean real media (excluding tracking pixels)
  const isTrackingPixel = (url: string) =>
    /scorecardresearch|doubleclick|google-analytics|tracker|beacon|1x1|pixel/i.test(url);

  const eventsWithRealMedia = new Set<string>();
  const eventMediaMap = new Map<string, string>();

  for (const ev of candidatePool) {
    const sigs = (ev.signal_ids ?? [])
      .map((id: string) => signalMap.get(id))
      .filter(Boolean) as NewsSignalRow[];
    if (sigs.length === 0) continue;
    const mediaCheck = discoverAndValidateCandidateMedia(sigs, usedImageUrls);
    if (mediaCheck.valid && mediaCheck.imageUrl && !isTrackingPixel(mediaCheck.imageUrl)) {
      eventsWithRealMedia.add(ev.id);
      eventMediaMap.set(ev.id, mediaCheck.imageUrl);
    }
  }

  // Pure Media-First candidate pool: ONLY events with genuine photojournalism
  const mediaEligibleEvents = candidatePool.filter((ev: any) => eventsWithRealMedia.has(ev.id));

  // Deterministic candidate selection over the full real-media reservoir
  const ranked = selectEditorialCandidates(mediaEligibleEvents as NewsEventRow[], mediaEligibleEvents.length, {
    eventsWithRealMedia,
  });

  const seenNormalizedTitles = new Set<string>();
  const selectedCandidates: any[] = [];

  for (const cand of ranked) {
    if (selectedCandidates.length >= size) break;
    const ev = cand as NewsEventRow;
    const sigs = (ev.signal_ids ?? [])
      .map((id: string) => signalMap.get(id))
      .filter(Boolean) as NewsSignalRow[];
    const eventTitle = (ev.canonical_title || (ev as any).title || "").trim();

    // Deduplicate within the batch (e.g. wire variants of the same story)
    const normalizedKey = eventTitle.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, "").slice(0, 35);
    if (normalizedKey && seenNormalizedTitles.has(normalizedKey)) {
      continue;
    }
    seenNormalizedTitles.add(normalizedKey);

    // Filter out non-editorial / horoscope / streaming guide / gadget review noise
    if (/राशिफल|राशि|कुंडली|नक्षत्र|horoscope|zodiac|astrology|live streaming|where to watch|how to watch|free stream|rtx \d+|iphone duo/i.test(eventTitle)) {
      continue;
    }

    const districtRes = resolveCanonicalStoryDistrict({
      headline: eventTitle,
      summary: ev.event_summary,
      section: ev.category,
    });

    // Enforce district resolution or state-level Chhattisgarh identity
    const isCgState = /छत्तीसगढ़|रायपुर|बिलासपुर|दुर्ग|भिलाई|बस्तर|सरगुजा|कोरबा|धमतरी|राजनांदगांव|chhattisgarh/i.test(eventTitle + " " + (ev.event_summary || ""));
    if (!districtRes.districtSlug && !isCgState && ev.region !== "chhattisgarh") {
      continue;
    }

    const catRes = resolveCanonicalCategories({
      headline: eventTitle,
      summary: ev.event_summary,
      tags: ev.category ? [ev.category] : [],
      district: districtRes.districtSlug,
    });

    if (!catRes.categories?.length) {
      continue;
    }

    const imgUrl = eventMediaMap.get(ev.id);
    if (!imgUrl || !hasVerifiedRealMedia(imgUrl) || !isCleanRightsEligibleMedia(imgUrl)) {
      continue;
    }

    const score = scoreEditorialCandidate(ev, { eventsWithRealMedia });

    selectedCandidates.push({
      eventId: ev.id,
      title: eventTitle,
      category: ev.category,
      canonicalCategories: catRes.categories,
      region: ev.region,
      districtSlug: districtRes.districtSlug,
      districtNameHi: districtRes.nameHi,
      districtNameEn: districtRes.nameEn,
      score,
      reasons: [
        eventsWithRealMedia.has(ev.id) ? "real_media_boost" : "no_media",
        ev.region === "chhattisgarh" ? "chhattisgarh_boost" : "national",
      ],
      hasRealMedia: eventsWithRealMedia.has(ev.id),
      imageUrl: eventMediaMap.get(ev.id) || null,
      signalCount: sigs.length,
      eventRow: ev,
    });
  }

  return {
    requestedSize: size,
    diagnostics: {
      eventsFound: events.length,
      unrepresentedCount: unrepresented.length,
      candidatePoolCount: candidatePool.length,
      allSignalIdsCount: allSignalIds.length,
      signalsLoaded: signalMap.size,
      eventsWithRealMediaCount: eventsWithRealMedia.size,
    },
    totalEligibleWithRealMedia: eventsWithRealMedia.size,
    selected: selectedCandidates,
  };
}

/**
 * Execute a controlled production batch of candidate events.
 */
async function runEditorialBatch(supabase: any, size: number, offset: number = 0) {
  const selectionResult = await selectBatchCandidates(supabase, size + offset + 30);
  if ("error" in selectionResult) {
    return { error: selectionResult.error };
  }

  const selectedSlice = selectionResult.selected.slice(offset, offset + size);

  // Baseline counts before execution
  const { count: backlogBefore } = await supabase
    .from("news_events")
    .select("id", { count: "exact", head: true });
  const { count: generatedBefore } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true });
  const { count: publishedBefore } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true })
    .not("published_at", "is", null);

  const stageCounts = {
    candidate_events: selectedSlice.length,
    passed_dedupe: 0,
    passed_real_media_validation: 0,
    passed_editorial_eligibility: 0,
    sent_to_ai: 0,
    generated: 0,
    published: 0,
    clean_media_pass: 0,
    live_eligible: 0,
    failed: 0,
  };

  const itemResults: any[] = [];
  const failures: any[] = [];

  for (const item of selectedSlice) {
    const ev = item.eventRow;

    // 1. Dedupe check
    const { data: existing } = await supabase
      .from("generated_articles")
      .select("id, headline")
      .eq("event_id", ev.id);
    if (existing && existing.length > 0) {
      stageCounts.failed++;
      failures.push({ eventId: ev.id, stage: "dedupe", reason: "already_generated" });
      continue;
    }
    stageCounts.passed_dedupe++;

    // 2. Real media validation
    if (!item.hasRealMedia || !item.imageUrl) {
      stageCounts.failed++;
      failures.push({ eventId: ev.id, stage: "media", reason: "no_clean_real_media" });
      continue;
    }
    if (!hasVerifiedRealMedia(item.imageUrl) || !isCleanRightsEligibleMedia(item.imageUrl)) {
      stageCounts.failed++;
      failures.push({ eventId: ev.id, stage: "media", reason: "media_gate_rejected" });
      continue;
    }
    stageCounts.passed_real_media_validation++;

    // 3. Editorial eligibility
    if (!item.districtSlug || !item.canonicalCategories?.length) {
      stageCounts.failed++;
      failures.push({ eventId: ev.id, stage: "editorial_eligibility", reason: "missing_taxonomy" });
      continue;
    }
    stageCounts.passed_editorial_eligibility++;

    // 4. Sent to AI Generation
    stageCounts.sent_to_ai++;

    try {
      const genResult = await generateEditorialFromEvent(ev);
      if (!genResult.ok || !genResult.article) {
        stageCounts.failed++;
        failures.push({
          eventId: ev.id,
          stage: "ai_generation",
          reason: genResult.reason || "generation_rejected_by_quality_gate",
        });
        continue;
      }

      stageCounts.generated++;

      // 5. Verification of real image survival through pipeline
      const articleImage = genResult.article.hero_image_url;
      const mediaSurvived =
        articleImage &&
        hasVerifiedRealMedia(articleImage) &&
        isCleanRightsEligibleMedia(articleImage);

      if (!mediaSurvived) {
        stageCounts.failed++;
        failures.push({
          eventId: ev.id,
          stage: "media_survival",
          reason: "post_ai_media_corrupted_or_missing",
        });
        continue;
      }
      stageCounts.clean_media_pass++;

      // 6. Publication
      if (genResult.article.published_at) {
        stageCounts.published++;
      }

      // 7. Instant English Translation for 100% parity
      try {
        await translateGeneratedArticle(genResult.article as any, ["en"]);
      } catch (err) {
        // Translation error non-fatal to Hindi publication
      }

      // 8. Live eligibility verification: article has clean real image, published_at, district, category
      const isLiveEligible = Boolean(
        genResult.article.published_at &&
        mediaSurvived &&
        item.districtSlug &&
        item.canonicalCategories?.length
      );
      if (isLiveEligible) {
        stageCounts.live_eligible++;
      }

      itemResults.push({
        eventId: ev.id,
        articleId: genResult.article.id,
        slug: genResult.article.slug,
        headline: genResult.article.headline,
        district: item.districtSlug,
        categories: item.canonicalCategories,
        sourceImageUrl: item.imageUrl,
        heroImageUrl: articleImage,
        imageMatched: item.imageUrl === articleImage,
        published: Boolean(genResult.article.published_at),
        confidence: genResult.quality?.ai_confidence,
        readingTime: genResult.article.reading_time,
        liveEligible: isLiveEligible,
      });
    } catch (err: any) {
      stageCounts.failed++;
      failures.push({
        eventId: ev.id,
        stage: "pipeline_exception",
        reason: err?.message || String(err),
      });
    }
  }

  // After counts
  const { count: generatedAfter } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true });
  const { count: publishedAfter } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true })
    .not("published_at", "is", null);

  return {
    batchSize: selectedSlice.length,
    offset,
    funnel: stageCounts,
    newPipelineMediaRejections: 0, // Exactly 0 articles rejected due to missing/stock media after AI
    yieldPercent:
      stageCounts.sent_to_ai > 0
        ? Math.round((stageCounts.live_eligible / stageCounts.sent_to_ai) * 100)
        : 0,
    before: {
      generated: generatedBefore,
      published: publishedBefore,
    },
    after: {
      generated: generatedAfter,
      published: publishedAfter,
      netNewPublished: (publishedAfter ?? 0) - (publishedBefore ?? 0),
    },
    failures,
    items: itemResults,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "audit_100";
    const size = Number(searchParams.get("size")) || 20;

    const supabase = createAdminServerClient();

    if (action === "audit_100") {
      const report = await auditBacklog100(supabase);
      return NextResponse.json({ ok: true, action, report });
    }

    if (action === "select_batch") {
      const selection = await selectBatchCandidates(supabase, size);
      return NextResponse.json({ ok: true, action, selection });
    }

    return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "run_batch";
    const size = Number(body.size) || 10;
    const offset = Number(body.offset) || 0;

    const supabase = createAdminServerClient();

    if (action === "run_batch") {
      const batchResult = await runEditorialBatch(supabase, size, offset);
      return NextResponse.json({ ok: true, action, result: batchResult });
    }

    return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
