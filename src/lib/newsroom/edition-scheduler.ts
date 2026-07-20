import { createAdminServerClient } from "@/lib/supabase";
import { publishGeneratedArticle } from "@/lib/editorial/publication";
import {
  EDITORIAL_CAPACITY,
  getEffectiveDailyLimit,
} from "@/lib/newsroom/editorial-capacity";
import { getAutonomousRolloutStage } from "@/lib/autonomous/rollout-state";
import {
  evaluatePublicationPacing,
  PACING,
} from "@/lib/autonomous/publication-pacing";
import { getIstDayBounds } from "@/lib/autonomous/ist-day";

export type EditionPublishSlot =
  | "06:00"
  | "09:00"
  | "12:00"
  | "15:00"
  | "18:00"
  | "21:00";

const IST_TZ = "Asia/Kolkata";
const SLOT_HOURS: Record<EditionPublishSlot, number> = {
  "06:00": 6,
  "09:00": 9,
  "12:00": 12,
  "15:00": 15,
  "18:00": 18,
  "21:00": 21,
};

/** Base (shadow / 40-day) slot limits before stage scaling. */
function baseEditionPublishLimit(slot: EditionPublishSlot): number {
  if (slot === "06:00" || slot === "09:00") {
    return Math.max(1, Math.floor(EDITORIAL_CAPACITY.editions.morning / 2));
  }
  if (slot === "12:00") return EDITORIAL_CAPACITY.editions.noon;
  if (slot === "15:00") return EDITORIAL_CAPACITY.editions.afternoon;
  if (slot === "18:00") return EDITORIAL_CAPACITY.editions.evening;
  return EDITORIAL_CAPACITY.editions.night;
}

function getIstHourMinute(now = new Date()): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

export function resolveEditionPublishSlot(
  now = new Date()
): { ok: true; slot: EditionPublishSlot } | { ok: false; reason: string } {
  const { hour, minute } = getIstHourMinute(now);
  if (minute !== 0) return { ok: false, reason: "outside_slot_minute" };

  const slot = (Object.keys(SLOT_HOURS) as EditionPublishSlot[]).find(
    (s) => SLOT_HOURS[s] === hour
  );
  if (!slot) return { ok: false, reason: "outside_slot_hour" };
  return { ok: true, slot };
}

/**
 * Scale slot limits so daily slot sum tracks getEffectiveDailyLimit().
 * 40 → 60 at stage_1 = ×1.5. Integer floors; min 1 when original > 0.
 */
export function resolveEditionPublishLimit(
  slot: EditionPublishSlot,
  env: NodeJS.ProcessEnv = process.env
): number {
  const base = baseEditionPublishLimit(slot);
  const effective = getEffectiveDailyLimit(env);
  const scale = effective / EDITORIAL_CAPACITY.dailyLimit;
  if (scale === 1) return base;
  const scaled = Math.floor(base * scale);
  return base > 0 ? Math.max(1, scaled) : 0;
}

export type EditionPublishResult = {
  ok: boolean;
  slot?: EditionPublishSlot;
  limit: number;
  published: number;
  attempted: number;
  errors: string[];
  reason?: string;
  pacingSkipped?: number;
};

async function countPublishesInLastHour(
  supabase: ReturnType<typeof createAdminServerClient>,
  now = new Date()
): Promise<number> {
  const since = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true })
    .eq("workflow_status", "published")
    .gte("published_at", since);
  return count ?? 0;
}

async function countPublishedTodayIst(
  supabase: ReturnType<typeof createAdminServerClient>,
  now = new Date()
): Promise<number> {
  const bounds = getIstDayBounds(now);
  const { count } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true })
    .eq("workflow_status", "published")
    .gte("published_at", bounds.startIso)
    .lt("published_at", bounds.endIso);
  return count ?? 0;
}

function primaryDistrictFromGeo(
  geo: Record<string, unknown> | null | undefined
): string | null {
  if (!geo || typeof geo !== "object") return null;
  if (typeof geo.primary_district === "string" && geo.primary_district.trim()) {
    return geo.primary_district.trim().toLowerCase();
  }
  if (typeof geo.district === "string" && geo.district.trim()) {
    return geo.district.trim().toLowerCase();
  }
  return null;
}

async function minutesSinceDistrictPublish(
  supabase: ReturnType<typeof createAdminServerClient>,
  districtSlug: string,
  now: Date,
  inLoopLast: Map<string, number>
): Promise<number | null> {
  const loopTs = inLoopLast.get(districtSlug);
  if (loopTs != null) {
    return (now.getTime() - loopTs) / 60_000;
  }

  const { data } = await supabase
    .from("generated_articles")
    .select("published_at, geo_metadata")
    .eq("workflow_status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(80);

  for (const row of data ?? []) {
    const primary = primaryDistrictFromGeo(
      row.geo_metadata as Record<string, unknown> | null
    );
    if (primary !== districtSlug) continue;
    const publishedAt = row.published_at
      ? Date.parse(row.published_at as string)
      : NaN;
    if (!Number.isFinite(publishedAt)) continue;
    return (now.getTime() - publishedAt) / 60_000;
  }
  return null;
}

export async function publishScheduledForCurrentEdition(
  now = new Date()
): Promise<EditionPublishResult> {
  const slot = resolveEditionPublishSlot(now);
  if (!slot.ok) {
    return {
      ok: true,
      limit: 0,
      published: 0,
      attempted: 0,
      errors: [],
      reason: slot.reason,
    };
  }

  let limit = resolveEditionPublishLimit(slot.slot);
  const supabase = createAdminServerClient();
  const stage = getAutonomousRolloutStage();
  const dailyLimit = getEffectiveDailyLimit();
  let publishedToday = await countPublishedTodayIst(supabase, now);

  if (publishedToday >= dailyLimit) {
    return {
      ok: true,
      slot: slot.slot,
      limit: 0,
      published: 0,
      attempted: 0,
      errors: [],
      reason: `daily_limit_reached:${publishedToday}/${dailyLimit}`,
      pacingSkipped: 0,
    };
  }
  limit = Math.min(limit, Math.max(0, dailyLimit - publishedToday));

  // Soft hourly cap when stage_1: 4 routine / hour
  if (stage === "stage_1") {
    const publishesInLastHour = await countPublishesInLastHour(supabase, now);
    const pacing = evaluatePublicationPacing({
      publishesInLastHour,
      isBreaking: false,
      stage: "stage_1",
    });
    const remainingHourly = Math.max(
      0,
      PACING.stage1RoutineMaxPerHour - publishesInLastHour
    );
    limit = Math.min(limit, remainingHourly);
    if (!pacing.allowed || limit <= 0) {
      return {
        ok: true,
        slot: slot.slot,
        limit: 0,
        published: 0,
        attempted: 0,
        errors: [],
        reason: pacing.reason,
        pacingSkipped: 0,
      };
    }
  }

  // Over-fetch scheduled candidates so district spacing skips can be filled.
  const fetchLimit =
    stage === "stage_1" ? Math.max(limit * 4, limit + 8) : limit;

  const { data: rows, error } = await supabase
    .from("generated_articles")
    .select("id,tenant_id,geo_metadata")
    .eq("workflow_status", "scheduled")
    .is("published_at", null)
    .order("created_at", { ascending: true })
    .limit(fetchLimit);

  if (error) {
    return {
      ok: false,
      slot: slot.slot,
      limit,
      published: 0,
      attempted: 0,
      errors: [error.message],
    };
  }

  const candidates = rows ?? [];
  let published = 0;
  let pacingSkipped = 0;
  let attempted = 0;
  const errors: string[] = [];
  const inLoopLast = new Map<string, number>();
  let publishesInLastHour =
    stage === "stage_1" ? await countPublishesInLastHour(supabase, now) : 0;

  for (const row of candidates) {
    if (published >= limit) break;
    if (publishedToday >= dailyLimit) break;

    const tenantId = row.tenant_id as string | null;
    if (!tenantId) {
      errors.push(`${row.id}:tenant_id_missing`);
      continue;
    }

    if (stage === "stage_1") {
      const district = primaryDistrictFromGeo(
        row.geo_metadata as Record<string, unknown> | null
      );
      const sinceDistrict = district
        ? await minutesSinceDistrictPublish(
            supabase,
            district,
            now,
            inLoopLast
          )
        : null;

      const pacing = evaluatePublicationPacing({
        publishesInLastHour,
        isBreaking: false,
        minutesSinceDistrictPublish: sinceDistrict,
        stage: "stage_1",
        now,
      });
      if (!pacing.allowed) {
        pacingSkipped += 1;
        continue;
      }
    }

    attempted += 1;
    const result = await publishGeneratedArticle(row.id as string, tenantId);
    if (result.ok) {
      published += 1;
      publishedToday += 1;
      publishesInLastHour += 1;
      const district = primaryDistrictFromGeo(
        row.geo_metadata as Record<string, unknown> | null
      );
      if (district) inLoopLast.set(district, now.getTime());
    } else {
      errors.push(`${row.id}:${result.message ?? "publish_failed"}`);
    }
  }

  return {
    ok: errors.length === 0,
    slot: slot.slot,
    limit,
    published,
    attempted,
    errors,
    pacingSkipped,
  };
}
