/**
 * POST/GET /api/cron/district-coverage
 * IST-day coverage planner with real published/generated counts + upsert.
 * Registered in vercel.json at "20 * * * *" (hourly :20).
 * Default AUTONOMOUS_ROLLOUT_STAGE=shadow → plan only; does NOT increase publish volume.
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import {
  getUnderCoveredDistricts,
  runCoverageController,
} from "@/lib/autonomous/coverage-controller";
import { planGnewsQuota } from "@/lib/autonomous/gnews-quota-planner";
import { getIstDayBounds } from "@/lib/autonomous/ist-day";
import {
  getAutonomousRolloutStage,
  isAutonomousKillSwitchOn,
} from "@/lib/autonomous/rollout-state";
import { CG_DISTRICTS } from "@/lib/regional/districts";
import { pipelineLog } from "@/lib/observability/production-log";
import { recordCronRun } from "@/lib/observability/cron-monitor";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleDistrictCoverage(request);
}

export async function POST(request: Request) {
  return handleDistrictCoverage(request);
}

function primaryDistrictFromRow(row: {
  geo_metadata?: Record<string, unknown> | null;
}): string | null {
  const geo = row.geo_metadata;
  if (!geo || typeof geo !== "object") return null;
  if (typeof geo.primary_district === "string" && geo.primary_district.trim()) {
    return geo.primary_district.trim().toLowerCase();
  }
  if (typeof geo.district === "string" && geo.district.trim()) {
    return geo.district.trim().toLowerCase();
  }
  return null;
}

async function loadDistrictCountsForIstDay(
  startIso: string,
  endIso: string
): Promise<{
  publishedByDistrict: Record<string, number>;
  generatedByDistrict: Record<string, number>;
}> {
  const publishedByDistrict: Record<string, number> = {};
  const generatedByDistrict: Record<string, number> = {};

  const { createAdminServerClient, isSupabaseConfigured } = await import(
    "@/lib/supabase"
  );
  if (!isSupabaseConfigured()) {
    return { publishedByDistrict, generatedByDistrict };
  }

  const supabase = createAdminServerClient();

  const { data: publishedRows, error: pubErr } = await supabase
    .from("generated_articles")
    .select("geo_metadata")
    .eq("workflow_status", "published")
    .gte("published_at", startIso)
    .lt("published_at", endIso)
    .limit(2000);

  if (pubErr) {
    pipelineLog("[district_coverage_publish_counts_error]", {
      message: pubErr.message,
    });
  } else {
    for (const row of publishedRows ?? []) {
      const slug = primaryDistrictFromRow(
        row as { geo_metadata?: Record<string, unknown> | null }
      );
      if (!slug) continue;
      publishedByDistrict[slug] = (publishedByDistrict[slug] ?? 0) + 1;
    }
  }

  const { data: generatedRows, error: genErr } = await supabase
    .from("generated_articles")
    .select("geo_metadata,created_at")
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .limit(2000);

  if (genErr) {
    pipelineLog("[district_coverage_generated_counts_error]", {
      message: genErr.message,
    });
  } else {
    for (const row of generatedRows ?? []) {
      const slug = primaryDistrictFromRow(
        row as { geo_metadata?: Record<string, unknown> | null }
      );
      if (!slug) continue;
      generatedByDistrict[slug] = (generatedByDistrict[slug] ?? 0) + 1;
    }
  }

  return { publishedByDistrict, generatedByDistrict };
}

async function persistCoverageDaily(
  day: string,
  planItems: Array<{
    districtSlug: string;
    tier: string;
    target: number;
    published: number;
    deficit: number;
  }>,
  generatedByDistrict: Record<string, number>
): Promise<{ upserted: number; error?: string }> {
  try {
    const { createAdminServerClient, isSupabaseConfigured } = await import(
      "@/lib/supabase"
    );
    if (!isSupabaseConfigured()) return { upserted: 0, error: "no_supabase" };

    const supabase = createAdminServerClient();
    const now = new Date().toISOString();
    const rows = planItems.map((item) => ({
      district_slug: item.districtSlug,
      day,
      target: item.target,
      published: item.published,
      deficit: item.deficit,
      tier: item.tier,
      metadata: {
        generated: generatedByDistrict[item.districtSlug] ?? 0,
        updated_via: "district-coverage-cron",
      },
      updated_at: now,
    }));

    const { error } = await supabase
      .from("district_coverage_daily")
      .upsert(rows, { onConflict: "district_slug,day" });

    if (error) return { upserted: 0, error: error.message };
    return { upserted: rows.length };
  } catch (err) {
    return {
      upserted: 0,
      error: err instanceof Error ? err.message : "upsert_failed",
    };
  }
}

async function handleDistrictCoverage(request: Request) {
  const startedAt = Date.now();
  const auth = await verifyCronRequest(request, { capability: "pipeline" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  const stage = getAutonomousRolloutStage();
  const killSwitch = isAutonomousKillSwitchOn();
  const bounds = getIstDayBounds();

  pipelineLog("[cron_triggered]", {
    job: "district-coverage",
    path: new URL(request.url).pathname,
    stage,
    killSwitch,
    istDay: bounds.day,
    ts: new Date().toISOString(),
  });

  if (killSwitch) {
    await recordCronRun({
      job: "district-coverage",
      ok: true,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      degraded: false,
    });
    return NextResponse.json(
      {
        ok: true,
        mode: "paused",
        reason: "AUTONOMOUS_KILL_SWITCH",
        stage,
        day: bounds.day,
      },
      { headers: noStoreHeaders() }
    );
  }

  // Prefer body injection (tests); otherwise load IST-day counts from DB.
  let publishedByDistrict: Record<string, number> = {};
  let generatedByDistrict: Record<string, number> = {};
  let bodyInjected = false;

  try {
    const body = await request.json();
    if (
      body &&
      typeof body === "object" &&
      body.publishedByDistrict &&
      typeof body.publishedByDistrict === "object"
    ) {
      publishedByDistrict = body.publishedByDistrict as Record<string, number>;
      bodyInjected = true;
      if (
        body.generatedByDistrict &&
        typeof body.generatedByDistrict === "object"
      ) {
        generatedByDistrict = body.generatedByDistrict as Record<
          string,
          number
        >;
      }
    }
  } catch {
    /* empty / non-JSON body */
  }

  if (!bodyInjected) {
    try {
      const counts = await loadDistrictCountsForIstDay(
        bounds.startIso,
        bounds.endIso
      );
      publishedByDistrict = counts.publishedByDistrict;
      generatedByDistrict = counts.generatedByDistrict;
    } catch (err) {
      pipelineLog("[district_coverage_publish_counts_error]", {
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  const { plan, publishAllowed, paused } = runCoverageController({
    day: bounds.day,
    publishedByDistrict,
  });

  const underCovered = getUnderCoveredDistricts(plan);
  const gnewsPlan = planGnewsQuota({
    day: bounds.day,
    requestsLimit: Number(process.env.GNEWS_DAILY_LIMIT ?? "100") || 100,
    requestsUsed: 0,
    underCovered,
  });

  const persist = await persistCoverageDaily(
    bounds.day,
    plan.items,
    generatedByDistrict
  );

  const shadowPayload = {
    ok: true,
    mode: "shadow" as const,
    publishAllowed: false,
    paused,
    stage,
    day: bounds.day,
    dayBounds: { startIso: bounds.startIso, endIso: bounds.endIso },
    plan,
    deficits: underCovered.map((i) => ({
      districtSlug: i.districtSlug,
      deficit: i.deficit,
      tier: i.tier,
      target: i.target,
      published: i.published,
    })),
    proposedGnewsQueries: gnewsPlan.queries,
    generatedByDistrict,
    persist,
    districtRegistrySize: CG_DISTRICTS.length,
  };

  // SHADOW: return full plan with deficits + proposed GNews queries
  if (stage === "shadow" || !publishAllowed) {
    pipelineLog("[district_coverage_shadow_plan]", {
      day: plan.day,
      totalDeficit: plan.totalDeficit,
      totalTarget: plan.totalTarget,
      underCovered: underCovered.length,
      proposedQueries: gnewsPlan.queries.length,
      persistUpserted: persist.upserted,
      top: plan.items.slice(0, 8).map((i) => ({
        district: i.districtSlug,
        deficit: i.deficit,
        tier: i.tier,
      })),
    });

    await recordCronRun({
      job: "district-coverage",
      ok: true,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      degraded: Boolean(persist.error),
    });

    return NextResponse.json(shadowPayload, { headers: noStoreHeaders() });
  }

  await recordCronRun({
    job: "district-coverage",
    ok: true,
    startedAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    degraded: Boolean(persist.error),
  });

  return NextResponse.json(
    {
      ...shadowPayload,
      mode: stage,
      publishAllowed,
      note: "Stage plan persisted; autonomous publish volume still gated by rollout + capacity.",
    },
    { headers: noStoreHeaders() }
  );
}
