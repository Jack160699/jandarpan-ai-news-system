/**
 * POST/GET /api/cron/district-coverage
 * Shadow-safe district coverage planner.
 * Registered in vercel.json at "20 * * * *" (hourly :20).
 * Default AUTONOMOUS_ROLLOUT_STAGE=shadow → plan only; does NOT increase publish volume.
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { runCoverageController } from "@/lib/autonomous/coverage-controller";
import {
  getAutonomousRolloutStage,
  isAutonomousKillSwitchOn,
} from "@/lib/autonomous/rollout-state";
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

function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function handleDistrictCoverage(request: Request) {
  const startedAt = Date.now();
  const auth = await verifyCronRequest(request, { capability: "pipeline" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  const stage = getAutonomousRolloutStage();
  const killSwitch = isAutonomousKillSwitchOn();

  pipelineLog("[cron_triggered]", {
    job: "district-coverage",
    path: new URL(request.url).pathname,
    stage,
    killSwitch,
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
      },
      { headers: noStoreHeaders() }
    );
  }

  // Prefer body injection (tests); otherwise load today's published counts from DB.
  let publishedByDistrict: Record<string, number> = {};
  try {
    const body = await request.json();
    if (
      body &&
      typeof body === "object" &&
      body.publishedByDistrict &&
      typeof body.publishedByDistrict === "object"
    ) {
      publishedByDistrict = body.publishedByDistrict as Record<string, number>;
    }
  } catch {
    /* empty / non-JSON body */
  }

  if (Object.keys(publishedByDistrict).length === 0) {
    try {
      const { createAdminServerClient, isSupabaseConfigured } = await import(
        "@/lib/supabase"
      );
      if (isSupabaseConfigured()) {
        const supabase = createAdminServerClient();
        const dayStart = `${utcDay()}T00:00:00.000Z`;
        const { data } = await supabase
          .from("generated_articles")
          .select("geo_metadata,tags")
          .eq("workflow_status", "published")
          .gte("published_at", dayStart)
          .limit(500);
        for (const row of data ?? []) {
          const geo = (row as { geo_metadata?: Record<string, unknown> | null })
            .geo_metadata;
          const slug =
            (typeof geo?.primary_district === "string" &&
              geo.primary_district) ||
            (typeof geo?.district === "string" && geo.district) ||
            null;
          if (!slug) continue;
          const key = slug.toLowerCase();
          publishedByDistrict[key] = (publishedByDistrict[key] ?? 0) + 1;
        }
      }
    } catch (err) {
      pipelineLog("[district_coverage_publish_counts_error]", {
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  const { plan, publishAllowed, paused } = runCoverageController({
    day: utcDay(),
    publishedByDistrict,
  });

  // SHADOW: log plan only — does not increase publish volume
  if (stage === "shadow" || !publishAllowed) {
    pipelineLog("[district_coverage_shadow_plan]", {
      day: plan.day,
      totalDeficit: plan.totalDeficit,
      totalTarget: plan.totalTarget,
      underCovered: plan.items.filter((i) => i.deficit > 0).length,
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
      degraded: false,
    });

    return NextResponse.json(
      {
        ok: true,
        mode: "shadow",
        publishAllowed: false,
        paused,
        stage,
        plan,
      },
      { headers: noStoreHeaders() }
    );
  }

  // Non-shadow stages: still plan-only in this foundation PR (no publish wiring yet)
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
      mode: stage,
      publishAllowed,
      paused,
      stage,
      plan,
      note: "Foundation: plan computed; publish wiring deferred to later stage.",
    },
    { headers: noStoreHeaders() }
  );
}
